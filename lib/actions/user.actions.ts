'use server'

import { revalidatePath } from 'next/cache'
import { connectToDatabase } from '@/lib/database'
import User from '@/lib/database/models/user.model'
import Order from '@/lib/database/models/order.model'
import Event from '@/lib/database/models/event.model'
import { handleError } from '@/lib/utils'
import { CreateUserParams, UpdateUserParams } from '@/types'

export async function createUser(user: CreateUserParams) {
  try {
    await connectToDatabase()
    const newUser = await User.create(user)
    return JSON.parse(JSON.stringify(newUser))
  } catch (error) {
    handleError(error);
    throw error; // Re-throw the error to propagate it further
  }
}

export async function getUserById(userId: string) {
  try {
    await connectToDatabase()
    const user = await User.findById(userId)

    if (!user) {
      throw new Error('User not found');
    }
    return JSON.parse(JSON.stringify(user));
  } catch (error) {
    handleError(error);
    throw error;
  }
}

export async function updateUser(clerkId: string, user: UpdateUserParams) {
  try {
    await connectToDatabase()
    const updatedUser = await User.findOneAndUpdate({ clerkId }, user, { new: true })

    if (!updatedUser) {
      throw new Error('User update failed');
    }
    return JSON.parse(JSON.stringify(updatedUser));
  } catch (error) {
    handleError(error);
    throw error;
  }
}

export async function deleteUser(clerkId: string) {
  try {
    await connectToDatabase()

    const userToDelete = await User.findOne({ clerkId })

    if (!userToDelete) {
      throw new Error('User not found');
    }

    // Update events
    const updateEvents = Event.updateMany(
      { _id: { $in: userToDelete.events } },
      { $pull: { organizer: userToDelete._id } }
    );

    // Update orders
    const updateOrders = Order.updateMany(
      { _id: { $in: userToDelete.orders } },
      { $unset: { buyer: 1 } }
    );

    // Wait for both updates to complete
    await Promise.all([updateEvents, updateOrders]);

    const deletedUser = await User.findByIdAndDelete(userToDelete._id)
    revalidatePath('/')

    return deletedUser ? JSON.parse(JSON.stringify(deletedUser)) : null
  } catch (error) {
    handleError(error);
    throw error;
  }
}
