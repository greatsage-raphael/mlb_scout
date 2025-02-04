import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import * as cheerio from 'cheerio';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { firstName, lastName } = req.body;

    // Convert the name to the Baseball Reference format
    const formattedLastName = lastName.toLowerCase();
    const formattedFirstName = firstName.toLowerCase();
    
    // Get first 5 letters of last name + first 2 of first name
    const playerIdBase = `${formattedLastName.slice(0, 5)}${formattedFirstName.slice(0, 2)}`;
    
    // Try to fetch the player page
    const firstLetter = formattedLastName[0];
    const url = `https://www.baseball-reference.com/players/${firstLetter}/${playerIdBase}01.shtml`;

    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    
    // Find the player image
    const imageUrl = $('.media-item.multiple img').first().attr('src');

    if (!imageUrl) {
      throw new Error('Image not found');
    }

    res.status(200).json({ imageUrl });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Failed to fetch player image' });
  }
} 