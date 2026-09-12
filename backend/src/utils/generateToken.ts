import jwt from 'jsonwebtoken';

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CRITICAL SECURITY ERROR: JWT_SECRET environment variable is missing in production!');
    }
    return 'ngcms_default_fallback_dev_secret_key_2026';
  }
  return secret;
};

const generateToken = (id: string, role: string, expiresIn?: jwt.SignOptions['expiresIn']) => {
  const options: jwt.SignOptions = {};
  if (expiresIn) {
    options.expiresIn = expiresIn;
  }

  return jwt.sign({ id, role }, getJwtSecret(), options);
};

export default generateToken;
