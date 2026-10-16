import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '../config/env.js';

export async function hashPassword(plainPassword) {
  if (!plainPassword || typeof plainPassword !== 'string') {
    throw new Error('Password must be a non-empty string');
  }
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainPassword, salt);
}

export async function verifyPassword(plainPassword, hashedPassword) {
  if (!plainPassword || !hashedPassword) {
    return false;
  }
  try {
    return await bcrypt.compare(plainPassword, hashedPassword);
  } catch (err) {
    return false;
  }
}

export function createAccessToken(payload) {
  const expiresInSeconds = config.jwtExpiresInMinutes * 60;
  return jwt.sign(
    {
      sub: payload.sub,
      role: payload.role || 'customer',
      mobile: payload.mobile || '',
    },
    config.jwtSecret,
    {
      expiresIn: expiresInSeconds,
      algorithm: 'HS256',
    }
  );
}

export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
  } catch (err) {
    return null;
  }
}

export default {
  hashPassword,
  verifyPassword,
  createAccessToken,
  verifyAccessToken,
};
