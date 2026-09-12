import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import AdminAuthChallenge from '../models/AdminAuthChallenge.js';
import SystemLog from '../models/SystemLog.js';
import { loginUser, verifyAdminOtp } from '../controllers/authController.js';
import { securityAlertService } from '../services/email/SecurityAlertService.js';
import { otpProvider } from '../services/auth/OtpProvider.js';

dotenv.config();

function makeMockReqRes(body: any = {}, ip = '192.168.1.5') {
  const req = {
    body,
    ip,
    headers: { 'user-agent': 'TestRunner/1.0' },
    socket: { remoteAddress: ip },
    get: () => 'TestRunner/1.0'
  } as any;

  const res = {
    statusCode: 200,
    jsonData: null as any,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      this.jsonData = data;
      return this;
    }
  } as any;

  return { req, res };
}

async function runAdminAuthTests() {
  console.log('\n==================================================');
  console.log('STARTING ADMIN AUTH SECURITY TESTS');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.log(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log('[INFO] Connected to MongoDB.');
  } catch (e: any) {
    console.error('[CRITICAL] MongoDB connection failed:', e.message);
    process.exit(1);
  }

  let emailCount = 0;
  let lastEmailEvent = '';
  securityAlertService.sendSecurityAlert = async (email, name, eventType) => {
    emailCount++;
    lastEmailEvent = eventType;
  };

  otpProvider.verifyOtp = async (challengeId, otp) => otp === '123456';

  const testEmail = 'admin_test_sec@ngcms.local';
  
  async function cleanup() {
    await User.deleteOne({ email: testEmail });
    await AdminAuthChallenge.deleteMany({});
    await SystemLog.deleteMany({ category: 'ADMIN_AUTH' });
    emailCount = 0;
    lastEmailEvent = '';
  }

  try {
    await cleanup();

    const testAdmin = await User.create({
      name: 'Security Admin',
      email: testEmail,
      password: 'StrongPassword123!',
      role: 'SUPER_ADMIN',
      isActive: true
    });

    console.log('\n--- Section 1: Password Lockout & Race Conditions ---');

    for (let i = 0; i < 4; i++) {
      const { req, res } = makeMockReqRes({ identifier: testEmail, password: 'Wrong' });
      await loginUser(req, res);
      assert(res.statusCode === 401, `Failed attempt ${i+1} rejected`);
    }

    const { req: req5, res: res5 } = makeMockReqRes({ identifier: testEmail, password: 'Wrong' });
    await loginUser(req5, res5);
    
    assert(res5.statusCode === 401, '5th failed attempt rejected');
    assert(emailCount === 1, 'Exactly one security email sent on 5th failure');
    assert(lastEmailEvent === 'ACCOUNT_LOCKED', 'Email event is ACCOUNT_LOCKED');

    let dbUser = await User.findById(testAdmin._id);
    assert(dbUser?.authentication?.failed_login_attempts === 5, 'Failure count is exactly 5');
    assert(dbUser?.authentication?.account_locked_until !== null, 'Account is locked');
    const lockTimeMs = dbUser?.authentication?.account_locked_until?.getTime() || 0;
    assert(lockTimeMs > Date.now(), 'Lock time is in the future');

    const { req: req6, res: res6 } = makeMockReqRes({ identifier: testEmail, password: 'Wrong' });
    await loginUser(req6, res6);
    
    dbUser = await User.findById(testAdmin._id);
    assert(dbUser?.authentication?.failed_login_attempts === 5, 'Failure count did NOT exceed 5 on 6th request');
    assert(emailCount === 1, 'No duplicate security emails sent');

    const { req: reqCorrect, res: resCorrect } = makeMockReqRes({ identifier: testEmail, password: 'StrongPassword123!' });
    await loginUser(reqCorrect, resCorrect);
    assert(resCorrect.statusCode === 401, 'Correct password during lockout is rejected');

    await User.updateOne({ _id: testAdmin._id }, { $set: { 'authentication.account_locked_until': new Date(Date.now() - 1000) } });
    
    const { req: reqExpiredLock, res: resExpiredLock } = makeMockReqRes({ identifier: testEmail, password: 'StrongPassword123!' });
    await loginUser(reqExpiredLock, resExpiredLock);
    
    assert(resExpiredLock.statusCode === 202, 'Successful login after lock expiry');
    const challengeId = resExpiredLock.jsonData.challengeId;
    assert(!!challengeId, 'Received OTP Challenge ID');

    console.log('\n--- Section 2: OTP Verification & Constraints ---');

    const { req: reqOTP1, res: resOTP1 } = makeMockReqRes({ challengeId, otp: '123456' });
    await verifyAdminOtp(reqOTP1, resOTP1);
    
    assert(resOTP1.statusCode === 200, 'Correct OTP authenticates successfully');
    assert(!!resOTP1.jsonData.token, 'JWT Token Issued');

    const { req: reqOTP2, res: resOTP2 } = makeMockReqRes({ challengeId, otp: '123456' });
    await verifyAdminOtp(reqOTP2, resOTP2);
    assert(resOTP2.statusCode === 400, 'Verified challenge cannot be reused');

    dbUser = await User.findById(testAdmin._id);
    assert(dbUser?.authentication?.failed_login_attempts === 0, 'Successful OTP reset failure counts');

    console.log('\n--- Section 3: OTP Failure Race Safety ---');
    const { req: reqNewC, res: resNewC } = makeMockReqRes({ identifier: testEmail, password: 'StrongPassword123!' });
    await loginUser(reqNewC, resNewC);
    const newChallengeId = resNewC.jsonData.challengeId;
    
    emailCount = 0;

    const wrongOtpRequests = Array(10).fill(null).map(() => {
      const { req, res } = makeMockReqRes({ challengeId: newChallengeId, otp: '000000' });
      return verifyAdminOtp(req, res);
    });
    
    await Promise.all(wrongOtpRequests);

    const chal = await AdminAuthChallenge.findById(newChallengeId);
    assert(chal?.failedAttempts === 5, 'Concurrent wrong OTPs maxed out exactly at 5');
    assert(chal?.status === 'failed', 'Challenge invalidated after 5 concurrent failures');

    dbUser = await User.findById(testAdmin._id);
    assert(dbUser?.authentication?.failed_login_attempts === 1, 'OTP exhaustion incremented account failure count exactly ONCE');
    
    assert(emailCount === 1, 'OTP limit triggered exactly ONE email');
    assert(lastEmailEvent === 'OTP_FAILURE_LIMIT_REACHED', 'Email event is OTP_FAILURE_LIMIT_REACHED');

    await cleanup();
  } catch (err: any) {
    console.error('[CRITICAL TEST FAILURE]:', err);
    failed++;
  } finally {
    await cleanup();
    await mongoose.connection.close();
    console.log('[INFO] Database connection closed.');
  }

  console.log('\n==================================================');
  console.log('ADMIN AUTH TEST SUMMARY');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log('==================================================\n');

  if (failed > 0) process.exit(1);
  else process.exit(0);
}

runAdminAuthTests();
