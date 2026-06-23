import { withErrorBoundary } from '@/utils/withErrorBoundary';
import BookTickets from '@/components/action-pages/BookTickets';
export default withErrorBoundary(BookTickets, 'MainCategorySlugBookTickets');
