import { withErrorBoundary } from '@/utils/withErrorBoundary';
import BookTable from '@/components/action-pages/BookTable';
export default withErrorBoundary(BookTable, 'MainCategorySlugBookTable');
