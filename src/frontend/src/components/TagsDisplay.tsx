import styles from './TagsDisplay.module.scss';

interface TagsDisplayProps {
  tags: string[];
  onTagClick?: (tag: string) => void;
  showTitle?: boolean;
}

export function TagsDisplay({ tags, onTagClick, showTitle = false }: TagsDisplayProps) {
  const handleTagClick = (tag: string) => {
    if (onTagClick) {
      onTagClick(tag);
    }
  };

  return (
    <div class={styles.container}>
      {showTitle && <h2>Tags</h2>}
      {tags && tags.length > 0 ? (
        <div class={styles.tagsList}>
          {tags.map((tag) => (
            <div
              class={styles.tagChip}
              onClick={() => handleTagClick(tag)}
              role="button"
              tabindex={0}
              onKeyPress={(e) => e.key === 'Enter' && handleTagClick(tag)}
            >
              #{tag}
            </div>
          ))}
        </div>
      ) : (
        <p>No tags found.</p>
      )}
    </div>
  );
}
