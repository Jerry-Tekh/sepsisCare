import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { RiHeartPulseLine, RiEyeLine, RiEyeOffLine } from "react-icons/ri";
import { FiMail, FiLock, FiUser, FiUserPlus } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext.jsx";
import Input from "../../components/common/Input.jsx";
import Button from "../../components/common/Button.jsx";
import styles from "./AuthPages.module.css";

export default function Register() {
  const { register } = useAuth();
  const navigate     = useNavigate();
  const [form, setForm]         = useState({ fullName: "", email: "", password: "" });
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
      await register(form);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed. Please try again.");
    } finally {
      setSub(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {/* Brand header */}
        <div className={styles.brand}>
          <RiHeartPulseLine size={36} className={styles.brandIcon} />
          <h1 className={styles.brandName}>SepsisGuard</h1>
          <p className={styles.brandTagline}>Caregiver Support Platform</p>
        </div>

        <h2 className={styles.formTitle}>Create your account</h2>

        <form onSubmit={handleSubmit} noValidate>
          <Input
            label="Full name"
            type="text"
            value={form.fullName}
            onChange={handleChange("fullName")}
            placeholder="Your full name"
            autoComplete="name"
            required
            icon={<FiUser />}
          />
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
            placeholder="At least 8 characters"
            autoComplete="new-password"
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

          {error && (
            <div className={styles.errorBox} role="alert">{error}</div>
          )}

          <Button type="submit" fullWidth disabled={submitting} icon={<FiUserPlus size={16} />}>
            {submitting ? "Creating account…" : "Create account"}
          </Button>
        </form>

        <p className={styles.switchLink}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
