import jwt from 'jsonwebtoken';

const generateToken = (id: string, role: string, expiresIn?: jwt.SignOptions['expiresIn']) => {
  const options: jwt.SignOptions = {};
  if (expiresIn) {
    options.expiresIn = expiresIn;
  }

  return jwt.sign({ id, role }, process.env.JWT_SECRET || 'secret', options);
};

export default generateToken;
