import React, { useState } from "react";
import Button from "components/ui/Button";
import Input from "components/ui/Input";
import Icon from "components/AppIcon";
import { miningService } from "../../../config/supabase";

const ROLE_OPTIONS = [
  { value: "admin", label: "Administrateur" },
  { value: "directeur", label: "Directeur" },
  { value: "chef_de_site", label: "Chef de Site" },
  { value: "comptable", label: "Comptable" },
];

const SITE_OPTIONS = [
  { value: "kamoto", label: "Site Kamoto" },
  { value: "kolwezi", label: "Site Kolwezi" },
  { value: "tenke", label: "Site Tenke" },
  { value: "mutanda", label: "Site Mutanda" },
];

export default function CreateAccountForm({ onSuccess }) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    role: "",
    site: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e?.target?.value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validate = () => {
    const errs = {};
    if (!form?.firstName?.trim()) errs.firstName = "Prénom requis";
    if (!form?.lastName?.trim()) errs.lastName = "Nom requis";
    if (!form?.email?.trim() || !/\S+@\S+\.\S+/?.test(form?.email)) errs.email = "E-mail invalide";
    if (!form?.role) errs.role = "Rôle requis";
    if (!form?.site) errs.site = "Site requis";
    if (!form?.password || form?.password?.length < 8) errs.password = "Minimum 8 caractères";
    if (form?.password !== form?.confirmPassword) errs.confirmPassword = "Les mots de passe ne correspondent pas";
    return errs;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const errs = validate();
    if (Object.keys(errs)?.length > 0) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    try {
      const newUser = {
        username: `${form.firstName.toLowerCase()}.${form.lastName.toLowerCase()}`,
        email: form.email,
        full_name: `${form.firstName} ${form.lastName}`,
        password_hash: form.password,
        role: form.role,
        department: form.site,
        is_active: true,
      };

      const { data, error } = await miningService.createUser('admin', newUser);
      if (error) {
        console.error('Erreur création utilisateur:', error);
        setErrors({ form: error.message || 'Erreur lors de la création du compte. Réessayez.' });
        return;
      }

      setSuccess(true);
      if (onSuccess) onSuccess(data);
    } catch (err) {
      console.error('Erreur CreateAccountForm:', err);
      setErrors({ form: 'Erreur inattendue. Réessayez.' });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-4">
        <div className="flex items-center justify-center w-16 h-16 rounded-full" style={{ background: "rgba(56,161,105,0.12)" }}>
          <Icon name="CheckCircle" size={36} color="var(--color-success)" />
        </div>
        <p className="text-base font-semibold text-center" style={{ color: "var(--color-foreground)", fontFamily: "var(--font-heading)" }}>
          Compte créé avec succès !
        </p>
        <p className="text-sm text-center" style={{ color: "var(--color-muted-foreground)", fontFamily: "var(--font-caption)" }}>
          {form?.firstName} {form?.lastName} peut maintenant se connecter.
        </p>
        <Button variant="outline" size="sm" onClick={() => { setSuccess(false); setForm({ firstName:"",lastName:"",email:"",phone:"",role:"",site:"",password:"",confirmPassword:"" }); }}>
          Créer un autre compte
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Prénom"
          type="text"
          placeholder="Jean"
          value={form?.firstName}
          onChange={handleChange("firstName")}
          error={errors?.firstName}
          required
        />
        <Input
          label="Nom"
          type="text"
          placeholder="Dupont"
          value={form?.lastName}
          onChange={handleChange("lastName")}
          error={errors?.lastName}
          required
        />
      </div>
      <Input
        label="Adresse e-mail"
        type="email"
        placeholder="jean.dupont@mineops.fr"
        value={form?.email}
        onChange={handleChange("email")}
        error={errors?.email}
        required
      />
      <Input
        label="Téléphone"
        type="tel"
        placeholder="+33 6 00 00 00 00"
        value={form?.phone}
        onChange={handleChange("phone")}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)", fontFamily: "var(--font-caption)" }}>
            Rôle <span className="text-red-500">*</span>
          </label>
          <select
            value={form?.role}
            onChange={handleChange("role")}
            className="w-full h-10 px-3 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            style={{ borderColor: errors?.role ? "var(--color-error)" : "var(--color-border)", background: "var(--color-card)", color: "var(--color-foreground)", fontFamily: "var(--font-caption)" }}
          >
            <option value="">Sélectionner un rôle</option>
            {ROLE_OPTIONS?.map((o) => <option key={o?.value} value={o?.value}>{o?.label}</option>)}
          </select>
          {errors?.role && <p className="text-xs mt-1" style={{ color: "var(--color-error)" }}>{errors?.role}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)", fontFamily: "var(--font-caption)" }}>
            Site d&apos;affectation <span className="text-red-500">*</span>
          </label>
          <select
            value={form?.site}
            onChange={handleChange("site")}
            className="w-full h-10 px-3 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            style={{ borderColor: errors?.site ? "var(--color-error)" : "var(--color-border)", background: "var(--color-card)", color: "var(--color-foreground)", fontFamily: "var(--font-caption)" }}
          >
            <option value="">Sélectionner un site</option>
            {SITE_OPTIONS?.map((o) => <option key={o?.value} value={o?.value}>{o?.label}</option>)}
          </select>
          {errors?.site && <p className="text-xs mt-1" style={{ color: "var(--color-error)" }}>{errors?.site}</p>}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Mot de passe"
          type="password"
          placeholder="Min. 8 caractères"
          value={form?.password}
          onChange={handleChange("password")}
          error={errors?.password}
          required
        />
        <Input
          label="Confirmer le mot de passe"
          type="password"
          placeholder="Répéter le mot de passe"
          value={form?.confirmPassword}
          onChange={handleChange("confirmPassword")}
          error={errors?.confirmPassword}
          required
        />
      </div>
      <Button
        variant="success"
        size="lg"
        fullWidth
        loading={loading}
        iconName="UserPlus"
        iconPosition="left"
        type="submit"
      >
        Créer le compte
      </Button>
    </form>
  );
}