"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { LockIcon } from "@phosphor-icons/react";
import { Spinner } from "@/components/ui/spinner";
import { notifyError, notifySuccess } from "@/components/ui/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function HostLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password || loading) return;

    setLoading(true);
    try {
      await api("/api/host/login", "POST", { password });
      notifySuccess("Добро пожаловать!");
      router.push("/host/panel");
      router.refresh();
    } catch (error) {
      notifyError("Не получилось войти");
      setPassword("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-100">
        <CardHeader className="text-center">
          <div className="flex size-11 mx-auto items-center justify-center rounded-md bg-primary/20 text-primary ring-1 ring-primary/40">
            <LockIcon className="size-5" weight="bold" />
          </div>

          <CardTitle className="text-2xl font-bold mt-2">
            Панель ведущего
          </CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit}>
            <Field>
              <Input
                type="password"
                placeholder="Пароль"
                value={password}
                className="w-full"
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
              <FieldDescription className="text-xs">
                Введи пароль, чтобы управлять очередью
              </FieldDescription>

              <Button type="submit" size="lg" disabled={loading || !password}>
                {loading && <Spinner />}
                {loading ? "Проверяем..." : "Войти"}
              </Button>
            </Field>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
