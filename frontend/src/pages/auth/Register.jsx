import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { RiEyeLine, RiEyeOffLine } from "react-icons/ri";
import { FiMail, FiLock, FiUser, FiUserPlus } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext.jsx";
import Input from "../../components/common/Input.jsx";
import Button from "../../components/common/Button.jsx";
import Spinner from "../../components/common/Spinner.jsx";
import { apiErrorMessage, fieldErrors } from "../../api/errors.js";
import AuthLayout from "./AuthLayout.jsx";
import styles from "./AuthPages.module.css";

// Mirrors the backend's register schema so most mistakes are caught before submitting.
function validate({ fullName, email, password }) {
  const errors = {};
  if (fullName.trim().length < 2) errors.fullName = "Full name must be at least 2 characters";
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) errors.email = "Enter a valid email address";
  if (password.length < 8) errors.password = "Password must be at least 8 characters";
  return errors;
}

export default function Register() {
  const { register } = useAuth();
  const navigate     = useNavigate();
  const [form, setForm]         = useState({ fullName: "", email: "", password: "" });
  const [errors, setErrors]     = useState({});
  const [error, setError]       = useState("");
  const [submitting, setSub]    = useState(false);
  const [showPass, setShowPass] = useState(false);

  function handleChange(field) {
    return (e) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      // Clear a field's error as soon as the user starts fixing it.
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const clientErrors = validate(form);
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length) return;

    setSub(true);
    try {
      await register(form);
      navigate("/dashboard");
    } catch (err) {
      const serverErrors = fieldErrors(err);
      setErrors(serverErrors);
      if (!Object.keys(serverErrors).length) setError(apiErrorMessage(err, "Registration failed. Please try again."));
    } finally {
      setSub(false);
    }
  }

  return (
    <AuthLayout title="Create account" heading="Create your account" subheading="It only takes a minute. Free for caregivers.">
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
          error={errors.fullName}
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
          error={errors.email}
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
          error={errors.password}
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

        <Button type="submit" fullWidth disabled={submitting} icon={submitting ? <Spinner size="sm" /> : <FiUserPlus size={16} />}>
          {submitting ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className={styles.switchLink}>
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </AuthLayout>
  );
}
