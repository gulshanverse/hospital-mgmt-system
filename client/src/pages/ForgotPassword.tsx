import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [mockResetLink, setMockResetLink] = useState("");

  const forgotMutation = trpc.auth.forgotPassword.useMutation({
    onSuccess: (data: any) => {
      setSubmitted(true);
      toast.success("Password reset request submitted");
      if (data?.token) {
        setMockResetLink(`/reset-password?token=${data.token}`);
      }
    },
    onError: (err) => {
      toast.error(err.message || "Failed to submit request");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    forgotMutation.mutate({ email });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">Reset Password</CardTitle>
          <CardDescription>
            Enter your email address and we'll send you a link to reset your password
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@hospital.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={forgotMutation.isPending}>
                {forgotMutation.isPending ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>
          ) : (
            <div className="space-y-4 text-center">
              <p className="text-green-600 font-medium">Check your email</p>
              <p className="text-gray-600">
                We've sent a password reset link to {email}
              </p>
              
              {mockResetLink && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-left">
                  <p className="text-xs text-yellow-800 font-semibold mb-1">Developer Notice (Mock Mailer):</p>
                  <a href={mockResetLink} className="text-xs text-blue-600 underline break-all font-mono">
                    Click here to follow reset link directly (Local Dev)
                  </a>
                </div>
              )}

              <Button
                onClick={() => {
                  setSubmitted(false);
                  setEmail("");
                  setMockResetLink("");
                }}
                variant="outline"
                className="w-full"
              >
                Back
              </Button>
            </div>
          )}
          <div className="mt-4 text-center text-sm">
            <p className="text-gray-600">
              Remember your password?{" "}
              <a href="/login" className="text-blue-600 hover:underline">
                Sign in
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
