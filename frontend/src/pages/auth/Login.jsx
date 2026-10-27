import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { RiEyeLine, RiEyeOffLine } from "react-icons/ri";
import { FiMail, FiLock, FiLogIn } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext.jsx";
import Input from "../../components/common/Input.jsx";
import Button from "../../components/common/Button.jsx";
import Spinner from "../../components/common/Spinner.jsx";
import AuthLayout from "./AuthLayout.jsx";
import styles from "./AuthPages.module.css";

export default function Login() {
  const { login } = useAuth();
  const navigate   = useNavigate();
  const [form, setForm]         = useState({ email: "", password: "" });
  const [error, setError]       = useState("");
  const [submitting, setSub]    = useState(false);
  const [showPass, setShowPass] = useState(false);

  function handleChange(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSub(true);
    try {
      await login(form);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed. Please try again.");
    } finally {
      setSub(false);
    }
  }

  return (
    <AuthLayout title="Sign in" heading="Welcome back" subheading="Sign in to continue caring for your patients.">
      <form onSubmit={handleSubmit} noValidate>
        <Input
          label="Email address"
          type="email"
          value={form.email}
          onChange={handleChange("email")}
          placeholder="you@example.com"
          autoComplete="email"
          required
          icon={<FiMail />}
        />
        <Input
          label="Password"
          type={showPass ? "text" : "password"}
          value={form.password}
          onChange={handleChange("password")}
          placeholder="Your password"
          autoComplete="current-password"
          required
          icon={<FiLock />}
          suffix={
            <button
              type="button"
              className={styles.eyeBtn}
              onClick={() => setShowPass((s) => !s)}
              aria-label={showPass ? "Hide password" : "Show password"}
            >
              {showPass ? <RiEyeOffLine size={17} /> : <RiEyeLine size={17} />}
            </button>
          }
        />

        {error && <div className={styles.errorBox} role="alert">{error}</div>}

        <Button type="submit" fullWidth disabled={submitting} icon={submitting ? <Spinner size="sm" /> : <FiLogIn size={16} />}>
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className={styles.switchLink}>
        Don't have an account? <Link to="/register">Create one</Link>
      </p>
    </AuthLayout>
  );
}
