import { Router } from 'express';
import { supabaseAuth } from '../services/supabase';
import { asyncHandler, createError } from '../middleware/errorHandler';

const router = Router();

// Register new user
router.post('/register', asyncHandler(async (req, res) => {
  const { email, password, full_name } = req.body;

  if (!email || !password || !full_name) {
    throw createError('Email, password, and full name are required', 400);
  }

  const { data, error } = await supabaseAuth.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name
      }
    }
  });

  if (error) {
    throw createError(error.message, 400);
  }

  res.status(201).json({
    success: true,
    data: {
      user: data.user,
      message: 'Registration successful. Please check your email for verification.'
    }
  });
}));

// Login user
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw createError('Email and password are required', 400);
  }

  const { data, error } = await supabaseAuth.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    throw createError(error.message, 401);
  }

  res.json({
    success: true,
    data: {
      user: data.user,
      session: data.session
    }
  });
}));

// Logout user
router.post('/logout', asyncHandler(async (req, res) => {
  const { error } = await supabaseAuth.auth.signOut();

  if (error) {
    throw createError(error.message, 400);
  }

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
}));

// Refresh token
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    throw createError('Refresh token is required', 400);
  }

  const { data, error } = await supabaseAuth.auth.refreshSession({
    refresh_token
  });

  if (error) {
    throw createError(error.message, 401);
  }

  res.json({
    success: true,
    data: {
      session: data.session
    }
  });
}));

// Request password reset
router.post('/forgot-password', asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw createError('Email is required', 400);
  }

  const { error } = await supabaseAuth.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.FRONTEND_URL}/reset-password`
  });

  if (error) {
    throw createError(error.message, 400);
  }

  res.json({
    success: true,
    message: 'Password reset email sent'
  });
}));

// Reset password
router.post('/reset-password', asyncHandler(async (req, res) => {
  const { access_token, refresh_token, new_password } = req.body;

  if (!access_token || !refresh_token || !new_password) {
    throw createError('Access token, refresh token, and new password are required', 400);
  }

  // Set the session
  const { error: sessionError } = await supabaseAuth.auth.setSession({
    access_token,
    refresh_token
  });

  if (sessionError) {
    throw createError(sessionError.message, 401);
  }

  // Update password
  const { error } = await supabaseAuth.auth.updateUser({
    password: new_password
  });

  if (error) {
    throw createError(error.message, 400);
  }

  res.json({
    success: true,
    message: 'Password updated successfully'
  });
}));

export default router;