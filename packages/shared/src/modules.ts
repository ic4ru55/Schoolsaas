export const MVP_MODULES = [
  { code: "establishment", label: "Etablissement", pack: "core" },
  { code: "academic_years", label: "Annees scolaires", pack: "core" },
  { code: "students", label: "Eleves", pack: "core" },
  { code: "guardians", label: "Parents et tuteurs", pack: "core" },
  { code: "classes", label: "Classes et niveaux", pack: "core" },
  { code: "subjects", label: "Matieres", pack: "core" },
  { code: "teachers", label: "Enseignants", pack: "core" },
  { code: "payments", label: "Paiements et recus", pack: "finance" },
  { code: "grades", label: "Notes et bulletins", pack: "pedagogy" },
  { code: "imports", label: "Import Excel", pack: "operations" },
  { code: "backups", label: "Sauvegardes", pack: "operations" },
  { code: "users", label: "Utilisateurs et roles", pack: "security" }
] as const;

export type ModuleCode = (typeof MVP_MODULES)[number]["code"];

