import { Prisma } from '@prisma/client';

export const stageSelect = {
  id: true,
  name: true,
  slug: true,
  color: true,
  order: true,
  winProbability: true,
} satisfies Prisma.StageSelect;

export const tagSelect = {
  id: true,
  name: true,
  color: true,
  createdAt: true,
} satisfies Prisma.TagSelect;

export const noteInclude = {
  author: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.NoteInclude;

export const reminderInclude = {
  contact: {
    select: {
      id: true,
      name: true,
      phone: true,
    },
  },
} satisfies Prisma.ReminderInclude;

export const contactSummaryInclude = {
  stage: {
    select: stageSelect,
  },
  tags: {
    include: {
      tag: {
        select: tagSelect,
      },
    },
  },
  _count: {
    select: {
      notes: true,
      reminders: true,
    },
  },
} satisfies Prisma.ContactInclude;

export const contactDetailInclude = {
  stage: {
    select: stageSelect,
  },
  tags: {
    include: {
      tag: {
        select: tagSelect,
      },
    },
  },
  notes: {
    include: noteInclude,
    orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
  },
  reminders: {
    include: reminderInclude,
    orderBy: {
      dueAt: 'asc',
    },
  },
} satisfies Prisma.ContactInclude;

export type ContactSummaryRecord = Prisma.ContactGetPayload<{
  include: typeof contactSummaryInclude;
}>;

export type ContactDetailRecord = Prisma.ContactGetPayload<{
  include: typeof contactDetailInclude;
}>;

export type NoteRecord = Prisma.NoteGetPayload<{
  include: typeof noteInclude;
}>;

export type ReminderRecord = Prisma.ReminderGetPayload<{
  include: typeof reminderInclude;
}>;

export function serializeStage(
  stage: Prisma.StageGetPayload<{ select: typeof stageSelect }>,
) {
  return {
    id: stage.id,
    name: stage.name,
    slug: stage.slug,
    color: stage.color,
    order: stage.order,
    winProbability: stage.winProbability,
  };
}

export function serializeTag(
  tag: Prisma.TagGetPayload<{ select: typeof tagSelect }>,
) {
  return {
    id: tag.id,
    name: tag.name,
    color: tag.color,
    createdAt: tag.createdAt,
  };
}

export function serializeNote(note: NoteRecord) {
  return {
    id: note.id,
    body: note.body,
    pinned: note.pinned,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    contactId: note.contactId,
    author: note.author,
  };
}

export function serializeReminder(reminder: ReminderRecord) {
  return {
    id: reminder.id,
    title: reminder.title,
    description: reminder.description,
    dueAt: reminder.dueAt,
    status: reminder.status,
    contactId: reminder.contactId,
    createdAt: reminder.createdAt,
    updatedAt: reminder.updatedAt,
    contact: reminder.contact,
  };
}

export function serializeContactSummary(contact: ContactSummaryRecord) {
  return {
    id: contact.id,
    name: contact.name,
    phone: contact.phone,
    email: contact.email,
    city: contact.city,
    source: contact.source,
    statusText: contact.statusText,
    avatarUrl: contact.avatarUrl,
    whatsappName: contact.whatsappName,
    lastInteractionAt: contact.lastInteractionAt,
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt,
    stage: serializeStage(contact.stage),
    tags: contact.tags.map(({ tag }) => serializeTag(tag)),
    notesCount: contact._count.notes,
    remindersCount: contact._count.reminders,
  };
}

export function serializeContactDetail(contact: ContactDetailRecord) {
  return {
    id: contact.id,
    name: contact.name,
    phone: contact.phone,
    email: contact.email,
    city: contact.city,
    source: contact.source,
    statusText: contact.statusText,
    avatarUrl: contact.avatarUrl,
    whatsappName: contact.whatsappName,
    lastInteractionAt: contact.lastInteractionAt,
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt,
    stage: serializeStage(contact.stage),
    tags: contact.tags.map(({ tag }) => serializeTag(tag)),
    notes: contact.notes.map(serializeNote),
    reminders: contact.reminders.map(serializeReminder),
  };
}
