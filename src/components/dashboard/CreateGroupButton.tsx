import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FamilySetupWizard } from "@/components/onboarding/FamilySetupWizard";

export function CreateGroupButton() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return <>
    <Button className="h-auto min-h-11 w-full whitespace-normal py-3" onClick={() => setOpen(true)}>
      <Plus className="mr-2 h-5 w-5 shrink-0" />{t("familySetup.createGroup")}
    </Button>
    {open && <FamilySetupWizard open={open} onComplete={() => setOpen(false)} onClose={() => setOpen(false)} />}
  </>;
}