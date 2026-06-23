import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import gameApi, { AvailableGame } from '@/services/gameApi';
import tournamentApi, { LiveTournament } from '@/services/tournamentApi';
import { formatTimeLeft } from '@/types/playandearn.types';

export interface GamesQueryData {
  games: AvailableGame[];
  tournaments: LiveTournament[];
}

export function useGamesData() {
  return useQuery<GamesQueryData>({
    queryKey: queryKeys.playAndEarn.games(),
    queryFn: async () => {
      const [gamesResponse, tournamentsResponse] = await Promise.all([
        gameApi.getAvailableGames(),
        tournamentApi.getLiveTournaments(5),
      ]);

      const games: AvailableGame[] =
        gamesResponse.success && gamesResponse.data?.games
          ? gamesResponse.data.games
          : [];

      let tournaments: LiveTournament[] = [];
      if (tournamentsResponse.success && tournamentsResponse.data?.tournaments) {
        tournaments = tournamentsResponse.data.tournaments
          .map((t: LiveTournament) => {
            const dateToUse = t.status === 'active' ? t.endDate : t.startDate;
            if (!dateToUse) return t;
            const { formatted } = formatTimeLeft(dateToUse);
            return {
              ...t,
              endsIn: t.status === 'active' ? formatted : t.endsIn,
              startsIn: t.status === 'upcoming' ? formatted : t.startsIn,
            };
          })
          .filter((t: LiveTournament) => {
            if (t.status === 'active' && t.endDate) {
              return formatTimeLeft(t.endDate).formatted !== 'Ended';
            }
            return true;
          });
      }

      return { games, tournaments };
    },
  });
}
