"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";

const schema = z.object({
  organizationName: z.string().min(1, "Brokerage name is required"),
  name: z.string().min(1, "Your name is required"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters"),
});

type FormValues = z.infer<typeof schema>;

export default function SignUpPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      await apiFetch("/api/auth/register", { method: "POST", json: values });
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });
      if (result?.error) throw new Error("Sign in failed after registration");
      router.push("/properties");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registration failed");
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">
        Create your brokerage account
      </h2>
      <Field
        label="Brokerage name"
        error={errors.organizationName?.message}
        required
      >
        <Input placeholder="Metro Commercial" {...register("organizationName")} />
      </Field>
      <Field label="Your name" error={errors.name?.message} required>
        <Input autoComplete="name" {...register("name")} />
      </Field>
      <Field label="Email" error={errors.email?.message} required>
        <Input type="email" autoComplete="email" {...register("email")} />
      </Field>
      <Field label="Password" error={errors.password?.message} required>
        <Input
          type="password"
          autoComplete="new-password"
          {...register("password")}
        />
      </Field>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button type="submit" loading={isSubmitting} className="w-full">
        Create account
      </Button>
      <p className="text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-brand-700 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
