"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useRequest } from "@/context/RequestContext";

export default function RequestReview() {
  const { lines, updateLine, removeLine, unitCount } = useRequest();

  return (
    <section id="request" className="space-y-4">
      <h2 className="text-2xl font-semibold">Your request</h2>
      <p className="text-muted-foreground">
        {lines.length === 0
          ? "No items yet. Add a catalogue product or a custom item."
          : `${lines.length} line${lines.length === 1 ? "" : "s"}, ${unitCount} unit${unitCount === 1 ? "" : "s"}.`}
      </p>
      <ul className="space-y-4">
        {lines.map((line) => (
          <li key={line.clientId} className="rounded-xl border p-4 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">{line.name}</p>
                <p className="text-sm text-muted-foreground">
                  {line.kind === "custom" ? "Custom" : "Catalogue"}
                  {line.categoryName ? ` · ${line.categoryName}` : ""}
                </p>
              </div>
              <Button type="button" variant="outline" onClick={() => removeLine(line.clientId)}>
                Remove
              </Button>
            </div>
            <label className="block text-sm font-medium">
              Quantity
              <Input
                className="mt-1 max-w-32"
                inputMode="numeric"
                value={String(line.quantity)}
                onChange={(event) => updateLine(line.clientId, { quantity: Number(event.target.value) || 1 })}
              />
            </label>
            <label className="block text-sm font-medium">
              Notes
              <Textarea
                className="mt-1"
                maxLength={2000}
                value={line.description ?? ""}
                onChange={(event) => updateLine(line.clientId, { description: event.target.value })}
              />
            </label>
            {line.imagePreview ? (
              <div className="space-y-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={line.imagePreview} alt="" className="h-24 w-24 rounded object-cover" />
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    updateLine(line.clientId, {
                      imagePreview: undefined,
                      imageName: undefined,
                      uploadId: undefined,
                    })
                  }
                >
                  Remove photo
                </Button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
