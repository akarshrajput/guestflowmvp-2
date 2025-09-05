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
import { login, setAuthToken, verifyLoginOTP } from '@/lib/api/auth';
import { useAuthStore } from '@/store/auth-store';
import { toast } from 'sonner';
import Link from 'next/link';
import { ArrowLeft, Mail, Shield } from 'lucide-react';

const formSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isVerifyingOTP, setIsVerifyingOTP] = useState(false);
  const { setIsAuthenticated, setUser } = useAuthStore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);
      const response = await login(values);
      
      if (response.requiresOTP) {
        setEmail(values.email);
        setShowOTP(true);
        toast.success('Verification code sent to your email');
      } else {
        // Fallback for non-OTP response (shouldn't happen with new flow)
        toast.error('Unexpected response from server');
      }
    } catch (error) {
      toast.error('Invalid email or password');
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPVerification = async () => {
    if (otp.length !== 6) {
      toast.error('Please enter the complete 6-digit code');
      return;
    }

    try {
      setIsVerifyingOTP(true);
      const { token, user } = await verifyLoginOTP({ email, otp });
      setAuthToken(token);
      setUser(user);
      setIsAuthenticated(true);
      toast.success('Login successful');
      router.push('/dashboard');
    } catch (error) {
      toast.error('Invalid verification code');
      console.error('OTP verification error:', error);
    } finally {
      setIsVerifyingOTP(false);
    }
  };

  const handleResendOTP = async () => {
    try {
      setIsLoading(true);
      const formValues = form.getValues();
      await login(formValues);
      toast.success('Verification code resent to your email');
    } catch (error) {
      toast.error('Failed to resend verification code');
      console.error('Resend OTP error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setShowOTP(false);
    setOtp('');
    setEmail('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-white">
      <Card className="w-full max-w-md border-none shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">
            {showOTP ? 'Verify Your Email' : 'Welcome back'}
          </CardTitle>
          <CardDescription>
            {showOTP 
              ? 'Enter the 6-digit code sent to your email'
              : 'Enter your credentials to access your account'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showOTP ? (
            <>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
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
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Password</FormLabel>
                          <Link href="/auth/forgot-password" className="text-sm text-primary hover:underline">
                        Forgot password?
                      </Link>
                    </div>
                    <FormControl>
                      <Input placeholder="Enter your password" type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </Form>
          <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{' '}
            <Link href="/auth/register" className="text-primary hover:underline">
              Sign up
            </Link>
          </div>
            </>
          ) : (
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
                    onClick={handleOTPVerification}
                    className="w-full" 
                    disabled={isVerifyingOTP || otp.length !== 6}
                  >
                    {isVerifyingOTP ? 'Verifying...' : 'Verify & Sign In'}
                  </Button>

                  <div className="flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleBackToLogin}
                      disabled={isVerifyingOTP}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Login
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
        </CardContent>
      </Card>
    </div>
  );
}
