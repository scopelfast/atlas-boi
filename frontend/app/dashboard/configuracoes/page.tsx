import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Palette } from "lucide-react";
import { ThemeSelector } from "@/components/theme/theme-toggle";

export default function ConfiguracoesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground">Ajustes gerais do sistema</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="h-5 w-5 text-[#1a5c2e] dark:text-emerald-400" />
            Aparência
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Escolha o tema da interface. A preferência é salva no navegador.
          </p>
          <ThemeSelector />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="h-5 w-5" />
            Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Mais opções em breve (empresa, notificações, integrações).</p>
        </CardContent>
      </Card>
    </div>
  );
}
