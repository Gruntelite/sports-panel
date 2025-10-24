"use client";
import React, { useState } from "react";
import { Button } from "./ui/button";
import { Send } from "lucide-react";

export default function SendPaymentLinkButton({ clubId, memberId, amount }: { clubId: string; memberId: string; amount: number }) {
  const [loading, setLoading] = useState(false);
  const handleClick = async () => {
    setLoading(true);
    try {
      console.log(clubId, memberId, amount);
      const res = await fetch("/api/fees/sendlink", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubId, memberId, amount }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Enlace enviado: " + (data.url || ""));
      } else {
        alert("Error: " + (data.error || "no se pudo crear enlace"));
      }
    } catch (err: any) {
      alert("Error interno: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={loading}>
      <Send className="mr-2 h-4 w-4"/>
      {loading ? "Enviando..." : "Enviar enlace de pago"}
    </Button>
  );
}
