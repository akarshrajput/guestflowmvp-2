'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { OTPInput } from '@/components/ui/otp-input';
import { toast } from 'sonner';
import Link from 'next/link';
import { ArrowLeft, Mail, Lock, CheckCircle } from 'lucide-react';
import apiClient from '@/lib/api/client';

const emailSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

const passwordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'otp' | 'password'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifyingOTP, setIsVerifyingOTP] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const emailForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: '',
    },
  });

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const handleSendOTP = async (values: z.infer<typeof emailSchema>) => {
    try {
      setIsLoading(true);
      const response = await apiClient.post('/auth/forgot-password', values);
      
      if (response.data.success) {
        setEmail(values.email);
        setStep('otp');
        toast.success('Verification code sent to your email');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send verification code');
      console.error('Send OTP error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      toast.error('Please enter the complete 6-digit code');
      return;
    }

    try {
      setIsVerifyingOTP(true);
      const response = await apiClient.post('/auth/verify-password-reset', {
        email,
        otp,
      });

      if (response.data.success) {
        setResetToken(response.data.resetToken);
        setStep('password');
        toast.success('Email verified successfully');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Invalid verification code');
      console.error('Verify OTP error:', error);
    } finally {
      setIsVerifyingOTP(false);
    }
  };

  const handleResetPassword = async (values: z.infer<typeof passwordSchema>) => {
    try {
      setIsResettingPassword(true);
      const response = await apiClient.post('/auth/reset-password', {
        resetToken,
        password: values.password,
      });

      if (response.data.success) {
        toast.success('Password reset successfully');
        router.push('/auth/login');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reset password');
      console.error('Reset password error:', error);
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleResendOTP = async () => {
    try {
      setIsLoading(true);
      const formValues = emailForm.getValues();
      await apiClient.post('/auth/forgot-password', formValues);
      toast.success('Verification code resent to your email');
    } catch (error: any) {
      toast.error('Failed to resend verification code');
      console.error('Resend OTP error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setStep('email');
    setOtp('');
  };

  const getStepTitle = () => {
    switch (step) {
      case 'email':
        return 'Forgot Password';
      case 'otp':
        return 'Verify Your Email';
      case 'password':
        return 'Reset Password';
      default:
        return 'Forgot Password';
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case 'email':
        return 'Enter your email address to receive a verification code';
      case 'otp':
        return 'Enter the 6-digit code sent to your email';
      case 'password':
        return 'Create a new password for your account';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">{getStepTitle()}</CardTitle>
          <CardDescription>{getStepDescription()}</CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'email' && (
            <>
              <Form {...emailForm}>
                <form onSubmit={emailForm.handleSubmit(handleSendOTP)} className="space-y-4">
                  <FormField
                    control={emailForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your email" type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Sending...' : 'Send Verification Code'}
                  </Button>
                </form>
              </Form>
              <div className="mt-4 text-center text-sm">
                Remember your password?{' '}
                <Link href="/auth/login" className="text-primary hover:underline">
                  Sign in
                </Link>
              </div>
            </>
          )}

          {step === 'otp' && (
            <>
              <div className="space-y-6">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <Mail className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    We sent a verification code to <strong>{email}</strong>
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Verification Code</label>
                    <OTPInput
                      value={otp}
                      onChange={setOtp}
                      disabled={isVerifyingOTP}
                      className="mt-2"
                    />
                  </div>

                  <Button 
                    onClick={handleVerifyOTP}
                    className="w-full" 
                    disabled={isVerifyingOTP || otp.length !== 6}
                  >
                    {isVerifyingOTP ? 'Verifying...' : 'Verify Email'}
                  </Button>

                  <div className="flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleBackToEmail}
                      disabled={isVerifyingOTP}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleResendOTP}
                      disabled={isLoading || isVerifyingOTP}
                    >
                      {isLoading ? 'Sending...' : 'Resend Code'}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}

          {step === 'password' && (
            <>
              <div className="space-y-6">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Email verified successfully. Now create a new password.
                  </p>
                </div>

                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit(handleResetPassword)} className="space-y-4">
                    <FormField
                      control={passwordForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter new password" type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={passwordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <Input placeholder="Confirm new password" type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" disabled={isResettingPassword}>
                      {isResettingPassword ? 'Resetting...' : 'Reset Password'}
                    </Button>
                  </form>
                </Form>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 