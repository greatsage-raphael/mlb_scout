const BASE_URL = 'https://statsapi.mlb.com/api/v1';

export const fetchPlayerData = async (playerId: string) => {
  try {
    const response = await fetch(`${BASE_URL}/people/${playerId}`);
    return await response.json();
  } catch (error) {
    console.error('Error fetching player data:', error);
    throw error;
  }
};

export const fetchTeamRoster = async (teamId: string, season: string) => {
  try {
    const response = await fetch(`${BASE_URL}/teams/${teamId}/roster?season=${season}`);
    return await response.json();
  } catch (error) {
    console.error('Error fetching team roster:', error);
    throw error;
  }
};