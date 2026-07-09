import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuthContext } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ShieldCheck, Mail } from "lucide-react";

export default function VerifyEmail() {
  const [location, setLocation] = useLocation();
  const { user, refresh } = useAuthContext();

  const [token, setToken] = useState("");
  const [code, setCode] = useState("");
  const [isSent, setIsSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const sendOtpMutation = trpc.auth.sendVerification.useMutation({
    onSuccess: (data: any) => {
      setIsSent(true);
      setCooldown(60);
      toast.success("Verification code sent successfully");
      if (data?.token) {
        setToken(data.token);
      }
    },
    onError: err => {
      toast.error(err.message || "Failed to send code");
    },
  });

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const verifyOtpMutation = trpc.auth.verifyEmail.useMutation({
    onSuccess: async () => {
      toast.success("Email verified successfully!");
      if (refresh) await refresh();
      setTimeout(() => {
        setLocation("/");
      }, 2000);
    },
    onError: err => {
      toast.error(err.message || "Invalid or expired verification code");
    },
  });

  const handleSendCode = () => {
    sendOtpMutation.mutate();
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error("Please request a code first");
      return;
    }
    if (code.length !== 6) {
      toast.error("Code must be 6 digits");
      return;
    }
    verifyOtpMutation.mutate({ token, code });
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-muted-foreground">
          Please sign in to verify your email.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto my-2 w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
            <Mail className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl">Verify Your Email</CardTitle>
          <CardDescription>
            Account:{" "}
            <span className="font-semibold text-gray-800">{user.email}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {user.isVerified ? (
            <div className="text-center space-y-4">
              <div className="mx-auto my-2 w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <p className="text-green-600 font-semibold">
                Your email is already verified!
              </p>
              <Button onClick={() => setLocation("/")} className="w-full">
                Go to Dashboard
              </Button>
            </div>
          ) : !isSent ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-gray-600">
                Verify your email to unlock all features of CareFlow HMS. We
                will send a 6-digit OTP code.
              </p>
              <Button
                onClick={handleSendCode}
                className="w-full"
                disabled={sendOtpMutation.isPending}
              >
                {sendOtpMutation.isPending
                  ? "Sending code..."
                  : "Send Verification Code"}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code" className="text-sm font-semibold">
                  6-Digit OTP Code
                </Label>
                <Input
                  id="code"
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  className="text-center tracking-widest text-lg font-semibold"
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={verifyOtpMutation.isPending}
              >
                {verifyOtpMutation.isPending ? "Verifying..." : "Verify Code"}
              </Button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={sendOtpMutation.isPending || cooldown > 0}
                  className="text-xs text-indigo-600 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cooldown > 0
                    ? `Resend Code in ${cooldown}s`
                    : "Resend Verification Code"}
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
