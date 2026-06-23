import { withErrorBoundary } from '@/utils/withErrorBoundary';
import BookService from '@/components/action-pages/BookService';
export default withErrorBoundary(BookService, 'MainCategorySlugBookService');
