"use client";
import React, { useState } from "react";

export default function SendPaymentLinkButton({ clubId, memberId, amount }: { clubId: string; memberId: string; amount: number }) {
  const [loading, setLoading] = useState(false);
  const handleClick = async () => {
    setLoading(true);
    try {
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
    <button onClick={handleClick} disabled={loading} className="btn btn-primary">
      {loading ? "Enviando..." : "Enviar enlace de pago"}
    </button>
  );
}
