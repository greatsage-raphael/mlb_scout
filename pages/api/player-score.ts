import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { load } from 'cheerio';

async function getPlayerId(firstName, lastName) {
    const baseUrl = `https://www.baseball-reference.com/players/${lastName[0].toLowerCase()}/`;

    console.log(`[INFO] Fetching player list from: ${baseUrl}`);

    try {
        const { data } = await axios.get(baseUrl);
        const $ = load(data);

        // Log first 500 characters of HTML to check if we're fetching correctly
        console.log(`[DEBUG] First 500 chars of HTML:`, data.substring(0, 500));

        let foundId: string | null = null;

        $("a[href]").each((_, el) => {
            const href = $(el).attr("href");
            const text = $(el).text().trim();

            if (href?.includes(".shtml") && 
                text.toLowerCase().includes(firstName.toLowerCase()) &&
                text.toLowerCase().includes(lastName.toLowerCase())) {
                console.log(`[MATCH] Found potential player: ${text}, Link: ${href}`);
                foundId = href?.split("/").pop()?.replace(".shtml", "") || null;
                return false; // Stop looping once found
            }
        });

        if (!foundId) {
            console.log(`[ERROR] No matching player found for ${firstName} ${lastName}`);
        }

        return foundId;
    } catch (error) {
        console.error(`[ERROR] Failed to fetch player ID:`, error.message);
        return null;
    }
}

async function scrapePlayerStats(playerId) {
    if (!playerId) {
        console.error("[ERROR] Invalid player ID.");
        return null;
    }

    const url = `https://www.baseball-reference.com/players/${playerId[0]}/${playerId}.shtml`;
    console.log(`[INFO] Scraping stats from: ${url}`);

    try {
        const { data } = await axios.get(url);
        const $ = load(data);

        console.log("[INFO] Page fetched successfully, looking for stats div...");

        const statsDiv = $('.stats_pullout');
        if (!statsDiv.length) {
            console.error("[ERROR] Stats div not found");
            return null;
        }

        console.log("[INFO] Stats div found, extracting current year stats...");

        // Modified helper function to handle R stat specially
        const getStat = (statName) => {
            const statDiv = statsDiv.find(`span:contains("${statName}")`).parent();
            if (statDiv.length) {
                // Get the first p element (current year stat)
                const value = statDiv.find('p').first().text();
                
                // Special handling for Runs to avoid picking up the year
                if (statName === 'R') {
                    const runsValue = statDiv.find('p').first().text().match(/\d+/);
                    if (runsValue && parseInt(runsValue[0]) < 1000) { // Convert to number before comparison
                        console.log(`[DEBUG] Found ${statName}: ${runsValue[0]}`);
                        return parseInt(runsValue[0]);
                    }
                    return 0;
                }
                
                console.log(`[DEBUG] Found ${statName}: ${value}`);
                return isNaN(parseFloat(value)) ? 0 : parseFloat(value);
            }
            console.log(`[WARN] Stat not found: ${statName}`);
            return 0;
        };

        const stats = {
            WAR: getStat('WAR'),
            AB: getStat('AB'),
            H: getStat('H'),
            HR: getStat('HR'),
            BA: getStat('BA'),
            R: getStat('R'),
            RBI: getStat('RBI'),
            SB: getStat('SB'),
            OBP: getStat('OBP'),
            SLG: getStat('SLG'),
            OPS: getStat('OPS'),
            OPSplus: getStat('OPS+')
        };

        console.log("[INFO] All stats extracted successfully");
        console.log("[DEBUG] Complete stats object:", stats);

        return stats;
    } catch (error) {
        console.error(`[ERROR] Failed to scrape player stats:`, error.message);
        return null;
    }
}

const leagueAverages = {
    WAR: 2.0,
    OPSplus: 100, // League average is always 100
    BA: 0.248,    // 2023 MLB average
    HR: 23,       // Approximate league average for qualified batters
    RBI: 70,      // Approximate league average for qualified batters
    OBP: 0.318,   // 2023 MLB average
    SB: 12,       // Approximate league average for qualified batters
    AB: 450       // Approximate for qualified batters
};

const stdDeviations = {
    WAR: 1.5,
    OPSplus: 20,
    BA: 0.030,
    HR: 10,
    RBI: 25,
    OBP: 0.035,
    SB: 8,
    AB: 150
};

function calculateZScore(value, average, stdDev) {
    return (value - average) / stdDev;
}

function normalizeScore(zScore) {
    // Convert z-score to 0-100 scale, capping at ±3 standard deviations
    const normalized = ((Math.min(Math.max(zScore, -3), 3) + 3) / 6) * 100;
    return normalized;
}

function calculatePlayerScore(stats) {
    console.log("[INFO] Calculating player score with improved methodology...");

    // Define weights that sum to 100%
    const weights = {
        WAR: 0.30,     // 30% - Overall value including defense
        OPSplus: 0.20, // 20% - Era and park-adjusted offensive production
        BA: 0.10,      // 10% - Pure hitting ability
        HR: 0.10,      // 10% - Power hitting
        RBI: 0.10,     // 10% - Run production
        OBP: 0.10,     // 10% - On-base ability
        SB: 0.05,      // 5%  - Speed/baserunning
        AB: 0.05       // 5%  - Playing time
    };

    // Calculate normalized scores for each metric
    const scores = {};
    Object.keys(weights).forEach(metric => {
        const zScore = calculateZScore(
            stats[metric],
            leagueAverages[metric],
            stdDeviations[metric]
        );
        scores[metric] = normalizeScore(zScore);
        
        console.log(`[DEBUG] ${metric}:`);
        console.log(`  Raw value: ${stats[metric]}`);
        console.log(`  Z-score: ${zScore.toFixed(2)}`);
        console.log(`  Normalized score: ${scores[metric].toFixed(2)}`);
        console.log(`  Weighted contribution: ${(scores[metric] * weights[metric]).toFixed(2)}`);
    });

    // Calculate final weighted score
    const finalScore = Object.keys(weights).reduce((total, metric) => {
        return total + (scores[metric] * weights[metric]);
    }, 0);

    console.log("\n[INFO] Score Breakdown:");
    Object.keys(weights).forEach(metric => {
        console.log(`  ${metric}: ${(scores[metric] * weights[metric]).toFixed(2)} points (${(weights[metric] * 100)}% weight)`);
    });

    return Math.round(finalScore * 100) / 100;
}


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { firstName, lastName } = req.query;

  if (!firstName || !lastName) {
    return res.status(400).json({ message: 'First name and last name are required' });
  }

  try {
    const playerId = await getPlayerId(firstName as string, lastName as string);
    
    if (!playerId) {
      return res.status(404).json({ message: 'Player not found' });
    }

    const stats = await scrapePlayerStats(playerId);
    
    if (!stats) {
      return res.status(404).json({ message: 'Player stats not found' });
    }

    const score = calculatePlayerScore(stats);

    return res.status(200).json({ score });
  } catch (error) {
    console.error('Error calculating player score:', error);
    return res.status(500).json({ message: 'Error calculating player score' });
  }
} 