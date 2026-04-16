"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createNotzSchema,
  deleteNotzSchema,
  updateNotzSchema,
} from "@/lib/validations/notz";
import type {
  CreateNotzInput,
  DeleteNotzInput,
  ManageNotzItem,
  UpdateNotzInput,
} from "@/lib/models/notz";
import { MAX_FEATURED_NOTZ } from "@/lib/models/notz";

const getSessionEmailOrRedirect = async () => {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/");
  }

  return session.user.email;
};

const getSessionEmailOrNull = async () => {
  const session = await auth();

  return session?.user?.email ?? null;
};

const revalidateNotzViews = () => {
  revalidatePath("/", "layout");
  revalidatePath("/create-notz");
};

export async function getNotz(name: string) {
  const userEmail = await getSessionEmailOrRedirect();

  const notz = await prisma.notz.findFirst({
    where: {
      name,
      user: {
        email: userEmail,
      },
    },
    select: {
      name: true,
    },
  });

  return notz;
}

export async function getFeaturedCount() {
  const userEmail = await getSessionEmailOrNull();

  if (!userEmail) {
    return 0;
  }

  return prisma.notz.count({
    where: {
      user: { email: userEmail },
      featured: true,
    },
  });
}

export async function getManageNotzData(): Promise<{
  featuredCount: number;
  notz: ManageNotzItem[];
}> {
  const userEmail = await getSessionEmailOrRedirect();

  const notz = await prisma.notz.findMany({
    where: {
      user: {
        email: userEmail,
      },
    },
    orderBy: [{ featured: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      featured: true,
    },
  });

  return {
    featuredCount: notz.filter((item) => item.featured).length,
    notz,
  };
}

export async function createNotz(input: CreateNotzInput) {
  const userEmail = await getSessionEmailOrNull();

  if (!userEmail) {
    return { error: "Unauthorized" };
  }

  const validated = createNotzSchema.safeParse(input);

  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  if (validated.data.featured) {
    const featuredCount = await prisma.notz.count({
      where: {
        user: { email: userEmail },
        featured: true,
      },
    });

    if (featuredCount >= MAX_FEATURED_NOTZ) {
      return {
        error: {
          featured: [`You can only feature up to ${MAX_FEATURED_NOTZ} notz`],
        },
      };
    }
  }

  try {
    const notz = await prisma.notz.create({
      data: {
        name: validated.data.name,
        featured: validated.data.featured,
        user: {
          connect: {
            email: userEmail,
          },
        },
      },
    });

    revalidateNotzViews();

    return { success: true, notz };
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint failed")) {
      return { error: { name: ["This notz already exists"] } };
    }

    return { error: "Failed to create notz" };
  }
}

export async function updateNotz(input: UpdateNotzInput) {
  const userEmail = await getSessionEmailOrNull();

  if (!userEmail) {
    return { error: "Unauthorized" };
  }

  const validated = updateNotzSchema.safeParse(input);

  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  const existingNotz = await prisma.notz.findFirst({
    where: {
      id: validated.data.id,
      user: {
        email: userEmail,
      },
    },
    select: {
      id: true,
    },
  });

  if (!existingNotz) {
    return { error: "Notz not found" };
  }

  if (validated.data.featured) {
    const featuredCount = await prisma.notz.count({
      where: {
        user: { email: userEmail },
        featured: true,
        NOT: {
          id: validated.data.id,
        },
      },
    });

    if (featuredCount >= MAX_FEATURED_NOTZ) {
      return {
        error: {
          featured: [`You can only feature up to ${MAX_FEATURED_NOTZ} notz`],
        },
      };
    }
  }

  try {
    const notz = await prisma.notz.update({
      where: {
        id: validated.data.id,
      },
      data: {
        name: validated.data.name,
        featured: validated.data.featured,
      },
    });

    revalidateNotzViews();

    return { success: true, notz };
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint failed")) {
      return { error: { name: ["This notz already exists"] } };
    }

    return { error: "Failed to update notz" };
  }
}

export async function deleteNotz(input: DeleteNotzInput) {
  const userEmail = await getSessionEmailOrNull();

  if (!userEmail) {
    return { error: "Unauthorized" };
  }

  const validated = deleteNotzSchema.safeParse(input);

  if (!validated.success) {
    return { error: "Invalid notz id" };
  }

  const result = await prisma.notz.deleteMany({
    where: {
      id: validated.data.id,
      user: {
        email: userEmail,
      },
    },
  });

  if (result.count === 0) {
    return { error: "Notz not found" };
  }

  revalidateNotzViews();

  return { success: true };
}
