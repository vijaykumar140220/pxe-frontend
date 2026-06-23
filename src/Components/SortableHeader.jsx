import React from "react";
import { FiArrowDown, FiArrowUp } from "react-icons/fi";

const SortableHeader = ({
  label,
  sortKey,
  sortConfig,
  onSort,
  className = "",
  style,
}) => {
  const isActive = sortConfig?.key === sortKey;
  const direction = isActive ? sortConfig.direction : "";

  const ariaSort = isActive
    ? direction === "asc"
      ? "ascending"
      : "descending"
    : "none";

  return (
    <th className={className} style={style} aria-sort={ariaSort}>
      <button
        type="button"
        className={`sort-header ${isActive ? "is-active" : ""}`}
        onClick={() => onSort(sortKey)}
      >
        <span>{label}</span>
        {isActive &&
          (direction === "asc" ? (
            <FiArrowUp aria-hidden="true" />
          ) : (
            <FiArrowDown aria-hidden="true" />
          ))}
      </button>
    </th>
  );
};

export default SortableHeader;
