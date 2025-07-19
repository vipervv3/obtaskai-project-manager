import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // TODO: Implement forgot password API call
      setTimeout(() => {
        setLoading(false);
        setIsSubmitted(true);
      }, 1000);
    } catch (error) {
      setLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="card max-w-md mx-auto">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Check your email</h2>
          <p className="text-gray-600">
            We've sent a password reset link to <strong>{email}</strong>
          </p>
          <p className="text-sm text-gray-500">
            Didn't receive the email? Check your spam folder or{' '}
            <button
              onClick={() => setIsSubmitted(false)}
              className="text-primary-600 hover:text-primary-500 font-medium"
            >
              try again
            </button>
          </p>
          <Link
            to="/auth/login"
            className="btn-secondary w-full inline-block text-center"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="card max-w-md mx-auto">
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Forgot your password?</h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="label">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="Enter your email"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center"
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Sending reset link...
              </>
            ) : (
              'Send reset link'
            )}
          </button>
        </form>

        <div className="text-center">
          <Link
            to="/auth/login"
            className="text-sm text-primary-600 hover:text-primary-500 font-medium"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;