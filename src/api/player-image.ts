import axios from 'axios';
import * as cheerio from 'cheerio';

export async function getPlayerImage(playerId: number) {
  try {
    const imageUrl = `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/${playerId}/headshot/67/current`;
    return { imageUrl };
  } catch (error) {
    console.error('Error:', error);
    throw new Error('Failed to fetch player image');
  }
} 