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
import { register as registerUser, setAuthToken, verifyRegistrationOTP } from '@/lib/api/auth';
import { useAuthStore } from '@/store/auth-store';
import { toast } from 'sonner';
import Link from 'next/link';
import { OTPInput } from '@/components/ui/otp-input';
import { ArrowLeft, Mail, Shield } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  hotelName: z.string().min(2, 'Hotel name is required'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function RegisterPage() {
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
      name: '',
      hotelName: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);
      console.log('Submitting registration with email:', values.email);
      const response = await registerUser(values);
      
      if (response.requiresOTP) {
        console.log('Setting email for OTP verification:', values.email);
        setEmail(values.email);
        setShowOTP(true);
        toast.success('Verification code sent to your email');
      } else {
        // Fallback for non-OTP response (shouldn't happen with new flow)
        toast.error('Unexpected response from server');
      }
    } catch (error) {
      toast.error('Registration failed. Please try again.');
      console.error('Registration error:', error);
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
      console.log('Verifying OTP with email:', email, 'and OTP:', otp);
      const { token, user } = await verifyRegistrationOTP({ email, otp });
      setAuthToken(token);
      setUser(user);
      setIsAuthenticated(true);
      toast.success('Registration completed successfully!');
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
      await registerUser(formValues);
      toast.success('Verification code resent to your email');
    } catch (error) {
      toast.error('Failed to resend verification code');
      console.error('Resend OTP error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToRegister = () => {
    setShowOTP(false);
    setOtp('');
    setEmail('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-white">
      <Card className="w-full max-w-md border-none shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">
            {showOTP ? 'Verify Your Email' : 'Create an account'}
          </CardTitle>
          <CardDescription>
            {showOTP 
              ? 'Enter the 6-digit code sent to your email'
              : 'Enter your details to create a new account'
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
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="hotelName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hotel Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your hotel name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input placeholder="Create a password" type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Creating account...' : 'Create Account'}
              </Button>
            </form>
          </Form>
          <div className="mt-4 text-center text-sm">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-primary hover:underline">
              Sign in
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
                  <p className="text-xs text-muted-foreground mt-1">
                    Please use the exact same email address you registered with
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
                    {isVerifyingOTP ? 'Verifying...' : 'Verify & Complete Registration'}
                  </Button>

                  <div className="flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleBackToRegister}
                      disabled={isVerifyingOTP}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Register
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
