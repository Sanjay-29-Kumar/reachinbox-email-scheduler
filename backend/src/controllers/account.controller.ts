import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export async function getAccountsHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.userId;

    const accounts = await prisma.connectedAccount.findMany({
      where: userId ? { userId } : undefined,
      select: {
        id: true,
        userId: true,
        provider: true,
        email: true,
        createdAt: true,
        updatedAt: true,
        // Explicitly exclude refreshToken
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return res.status(200).json({
      success: true,
      count: accounts.length,
      data: accounts,
    });
  } catch (error: any) {
    console.error('[Account Error] Failed to fetch connected accounts:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch connected accounts',
    });
  }
}

export async function deleteAccountHandler(req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Account ID is required',
      });
    }

    const existing = await prisma.connectedAccount.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: `Connected account with ID ${id} not found`,
      });
    }

    await prisma.connectedAccount.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: 'Connected Google account disconnected successfully',
    });
  } catch (error: any) {
    console.error('[Account Error] Failed to delete connected account:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to disconnect account',
    });
  }
}
