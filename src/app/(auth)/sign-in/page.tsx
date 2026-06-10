"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

export default function SignInPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const result = await signIn("credentials", { ...values, redirect: false });
    if (result?.error) {
      setError("Invalid email or password");
      return;
    }
    router.push("/properties");
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Sign in</h2>
      <Field label="Email" error={errors.email?.message} required>
        <Input type="email" autoComplete="email" {...register("email")} />
      </Field>
      <Field label="Password" error={errors.password?.message} required>
        <Input
          type="password"
          autoComplete="current-password"
          {...register("password")}
        />
      </Field>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button type="submit" loading={isSubmitting} className="w-full">
        Sign in
      </Button>
      <p className="text-center text-sm text-slate-500">
        New brokerage?{" "}
        <Link href="/sign-up" className="font-medium text-brand-700 hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
