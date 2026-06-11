"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/skeleton";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import {
  contactCreateSchema,
  type ContactCreateInput,
} from "@/features/properties/schemas";
import {
  useContacts,
  useCreateContact,
  useDeleteContact,
  useUpdateContact,
} from "@/features/properties/hooks";
import type { ContactRecord } from "@/features/properties/types";

function ContactForm({
  defaultValues,
  onSubmit,
  submitLabel,
  submitting,
  error,
}: {
  defaultValues?: ContactCreateInput;
  onSubmit: (values: ContactCreateInput) => void;
  submitLabel: string;
  submitting: boolean;
  error?: string;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactCreateInput>({
    resolver: zodResolver(contactCreateSchema),
    defaultValues,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Field label="Name" error={errors.name?.message} required>
        <Input placeholder="Alex Morgan" {...register("name")} />
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
          <Input type="email" placeholder="alex@example.com" {...register("email")} />
        </Field>
        <Field label="Phone">
          <Input placeholder="(555) 123-4567" {...register("phone")} />
        </Field>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="flex justify-end">
        <Button type="submit" loading={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

function toContactFormValues(contact: ContactRecord): ContactCreateInput {
  return {
    name: contact.name,
    title: contact.title ?? undefined,
    email: contact.email ?? "",
    phone: contact.phone ?? undefined,
    license: contact.license ?? undefined,
  };
}

export default function ContactsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactRecord | null>(null);
  const { data: contacts, isLoading } = useContacts();
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  const deleteContact = useDeleteContact();

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Contacts"
        subtitle="Manage broker contacts that can be assigned to property records and reused across marketing assets."
        actions={<Button onClick={() => setCreateOpen(true)}>New Contact</Button>}
      />

      {isLoading ? (
        <TableSkeleton rows={6} columns={6} />
      ) : !contacts || contacts.length === 0 ? (
        <EmptyState
          title="No contacts yet"
          description="Add broker contacts once, then assign them to properties from each property workspace."
          action={<Button onClick={() => setCreateOpen(true)}>New Contact</Button>}
        />
      ) : (
        <Card>
          <CardContent>
            <Table>
              <THead>
                <TR>
                  <TH>Name</TH>
                  <TH>Title</TH>
                  <TH>Email</TH>
                  <TH>Phone</TH>
                  <TH>Properties</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {contacts.map((contact) => (
                  <TR key={contact.id}>
                    <TD>
                      <div>
                        <p className="font-medium text-slate-900">{contact.name}</p>
                        {contact.license ? (
                          <p className="text-xs text-slate-500">
                            License {contact.license}
                          </p>
                        ) : null}
                      </div>
                    </TD>
                    <TD>{contact.title || "—"}</TD>
                    <TD>
                      {contact.email ? (
                        <a
                          href={`mailto:${contact.email}`}
                          className="text-brand-700 hover:underline"
                        >
                          {contact.email}
                        </a>
                      ) : (
                        "—"
                      )}
                    </TD>
                    <TD>{contact.phone || "—"}</TD>
                    <TD>{contact._count?.properties ?? 0}</TD>
                    <TD>
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setEditingContact(contact)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600"
                          loading={deleteContact.isPending}
                          onClick={() => {
                            if (
                              confirm(
                                "Delete this contact? They will be removed from assigned properties.",
                              )
                            ) {
                              deleteContact.mutate(contact.id);
                            }
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New Contact"
      >
        <ContactForm
          submitLabel="Create Contact"
          submitting={createContact.isPending}
          error={createContact.error?.message}
          onSubmit={(values) =>
            createContact.mutate(values, { onSuccess: () => setCreateOpen(false) })
          }
        />
      </Modal>

      <Modal
        open={editingContact !== null}
        onClose={() => setEditingContact(null)}
        title="Edit Contact"
      >
        {editingContact ? (
          <ContactForm
            key={editingContact.id}
            defaultValues={toContactFormValues(editingContact)}
            submitLabel="Save Changes"
            submitting={updateContact.isPending}
            error={updateContact.error?.message}
            onSubmit={(values) =>
              updateContact.mutate(
                { contactId: editingContact.id, input: values },
                { onSuccess: () => setEditingContact(null) },
              )
            }
          />
        ) : null}
      </Modal>
    </div>
  );
}
