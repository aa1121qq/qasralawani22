import React, { useState } from "react";
import { supabase } from "./supabaseClient";

function ResetPassword() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    // إعادة تعيين كلمة المرور
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setMsg("فشل تغيير كلمة المرور: " + error.message);
    } else {
      setMsg("تم تغيير كلمة المرور بنجاح! يمكنك الآن تسجيل الدخول بكلمتك الجديدة.");
    }
  };

  return (
    <div style={{ direction: "rtl", padding: 40 }}>
      <h2>إعادة تعيين كلمة المرور</h2>
      <form onSubmit={handleReset}>
        <input
          type="password"
          placeholder="كلمة المرور الجديدة"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ marginBottom: 10, width: 220, fontSize: 18 }}
          required
        />
        <br />
        <button disabled={loading}>
          {loading ? "يتم التغيير..." : "تغيير كلمة المرور"}
        </button>
      </form>
      {msg && <div style={{ marginTop: 20, color: "green" }}>{msg}</div>}
    </div>
  );
}

export default ResetPassword;
