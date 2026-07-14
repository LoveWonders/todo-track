export default function TagFilter({ tags, activeTag, onSelectTag }) {
  return (
    <div className="filter-bar">
      <div
        className={`filter-chip ${!activeTag ? 'active' : ''}`}
        onClick={() => onSelectTag(null)}
      >
        全部
      </div>
      {tags.map(tag => (
        <div
          key={tag}
          className={`filter-chip ${activeTag === tag ? 'active' : ''}`}
          onClick={() => onSelectTag(activeTag === tag ? null : tag)}
        >
          #{tag}
        </div>
      ))}
    </div>
  );
}
