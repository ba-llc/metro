"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input, Select } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { contactCreateSchema, type ContactCreateInput } from "../schemas";
import {
  useAssignContact,
  useContacts,
  useCreateContact,
  useUnassignContact,
} from "../hooks";
import type { PropertyContactRecord } from "../types";

export function ContactsPanel({
  propertyId,
  propertyContacts,
}: {
  propertyId: string;
  propertyContacts: PropertyContactRecord[];
}) {
  const [open, setOpen] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState("");
  const { data: allContacts } = useContacts();
  const createContact = useCreateContact();
  const assignContact = useAssignContact(propertyId);
  const unassignContact = useUnassignContact(propertyId);

  const assignedIds = new Set(propertyContacts.map((pc) => pc.contact.id));
  const unassigned = (allContacts ?? []).filter((c) => !assignedIds.has(c.id));

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactCreateInput>({ resolver: zodResolver(contactCreateSchema) });

  const onCreate = handleSubmit((values) =>
    createContact.mutate(values, {
      onSuccess: (contact) => {
        assignContact.mutate(contact.id, {
          onSuccess: () => {
            reset();
            setOpen(false);
          },
        });
      },
    }),
  );

  return (
    <Card>
      <CardHeader
        title="Broker Contacts"
        action={
          <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
            Add Contact
          </Button>
        }
      />
      <CardContent>
        {propertyContacts.length === 0 ? (
          <EmptyState
            title="No contacts assigned"
            description="Assigned brokers appear on flyer contact pages and listings."
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {propertyContacts.map((pc) => (
              <li key={pc.id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="font-medium text-slate-800">{pc.contact.name}</p>
                  <p className="text-xs text-slate-500">
                    {[pc.contact.title, pc.contact.phone, pc.contact.email]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-600"
                  onClick={() => unassignContact.mutate(pc.contact.id)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Modal open={open} onClose={() => setOpen(false)} title="Add Broker Contact">
        {unassigned.length > 0 ? (
          <div className="mb-6 space-y-3 border-b border-slate-100 pb-6">
            <Field label="Select from contacts">
              <Select
                value={selectedContactId}
                onChange={(e) => setSelectedContactId(e.target.value)}
              >
                <option value="">Select a contact...</option>
                {unassigned.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.title ? ` — ${c.title}` : ""}
                  </option>
                ))}
              </Select>
            </Field>
            <Button
              variant="secondary"
              disabled={!selectedContactId}
              loading={assignContact.isPending}
              onClick={() =>
                assignContact.mutate(selectedContactId, {
                  onSuccess: () => {
                    setSelectedContactId("");
                    setOpen(false);
                  },
                })
              }
            >
              Assign Contact
            </Button>
          </div>
        ) : null}

        <form onSubmit={onCreate} className="space-y-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Or add a manual contact
          </p>
          <p className="text-sm text-slate-500">
            Manual contacts are saved to the Contacts directory so they can be reused
            on future properties.
          </p>
          <Field label="Name" error={errors.name?.message} required>
            <Input {...register("name")} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Title">
              <Input placeholder="Senior Vice President" {...register("title")} />
            </Field>
            <Field label="License #">
              <Input {...register("license")} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Email" error={errors.email?.message}>
              <Input type="email" {...register("email")} />
            </Field>
            <Field label="Phone">
              <Input {...register("phone")} />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button
              type="submit"
              loading={createContact.isPending || assignContact.isPending}
            >
              Create & Assign
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
