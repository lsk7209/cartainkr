import { List } from "lucide-react";

interface TOCItem {
  id: string;
  text: string;
}

interface TableOfContentsProps {
  items: TOCItem[];
}

const TableOfContents = ({ items }: TableOfContentsProps) => {
  if (items.length === 0) return null;

  return (
    <nav className="toc-box" aria-label="목차">
      <h2 className="toc-title">
        <List className="w-4 h-4" />
        목차
      </h2>
      <ul className="toc-list">
        {items.map((item) => (
          <li key={item.id}>
            <a href={`#${item.id}`}>{item.text}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default TableOfContents;
