"use server";

import { redirect } from "next/navigation";

function readField(formData: FormData, field: string) {
  const value = formData.get(field);

  return typeof value === "string" ? value.trim() : "";
}

export async function submitContact(formData: FormData) {
  const payload = {
    company: readField(formData, "company"),
    email: readField(formData, "email"),
    message: readField(formData, "message"),
    name: readField(formData, "name"),
    source: "burrfx-about-page",
    topic: readField(formData, "topic"),
  };

  if (!payload.name || !payload.email || !payload.message) {
    redirect("/about?contact=missing");
  }

  let status = "sent";
  const webhookUrl = process.env.CONTACT_WEBHOOK_URL?.trim();

  if (webhookUrl) {
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        status = "failed";
      }
    } catch {
      status = "failed";
    }
  }

  redirect(`/about?contact=${status}`);
}

