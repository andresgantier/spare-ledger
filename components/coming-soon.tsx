import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

// Temporary content for sections built in later phases
export function ComingSoon({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <Card className="border-dashed shadow-none">
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <div className="flex size-11 items-center justify-center rounded-full bg-secondary">
          <Icon className="size-5 text-muted-foreground" />
        </div>
        <p className="max-w-sm text-sm text-muted-foreground">{text}</p>
      </CardContent>
    </Card>
  );
}
