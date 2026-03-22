import React, { useContext, useMemo, useState } from "react";
import { AppContext } from "./AppContext";
import PrintCard from "./PrintCard";
import searchIMG from "../../images/search.png";

import "../styles/prints.css";

function Prints() {
    const { printCount, isSignedIn, setDeleteView, setUpdateView, allPrints, handlePrintClick } = useContext(AppContext);

    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState("ALL");
    const [filterSize, setFilterSize] = useState("ALL");
    const [filterCategory, setFilterCategory] = useState("ALL");
    const [filterSigned, setFilterSigned] = useState("ALL");

    function handleDeleteBtnClick(print) {
        handlePrintClick(print);
        setDeleteView(true);
    }

    function handleEditBtnClick(print) {
        handlePrintClick(print);
        setUpdateView(true);
    }

    const filteredPrints = useMemo(() => {
        if (!allPrints) return [];
        const q = searchQuery.trim().toLowerCase();

        return allPrints.filter((print) => {
            if (filterStatus !== "ALL" && print.status !== filterStatus) return false;
            if (filterSize !== "ALL" && print.size !== filterSize) return false;
            if (filterCategory !== "ALL" && (print.category || null) !== filterCategory) return false;
            if (filterSigned !== "ALL") {
                if (Boolean(print.signed) !== (filterSigned === "true")) return false;
            }
            if (q) {
                const searchable = [
                    print.artist,
                    print.catalog_number,
                    print.date,
                    print.location,
                    print.instrument,
                    print.notes,
                    print.date_sold,
                    print.category,
                    print.size,
                    print.status,
                ].filter(Boolean).join(" ").toLowerCase();
                if (!searchable.includes(q)) return false;
            }
            return true;
        });
    }, [allPrints, searchQuery, filterStatus, filterSize, filterCategory, filterSigned]);

    const hasActiveFilters = searchQuery || filterStatus !== "ALL" || filterSize !== "ALL" || filterCategory !== "ALL" || filterSigned !== "ALL";

    function clearFilters() {
        setSearchQuery("");
        setFilterStatus("ALL");
        setFilterSize("ALL");
        setFilterCategory("ALL");
        setFilterSigned("ALL");
    }

    return (
        <>
            {isSignedIn && (
                <div id="prints-search-bar">
                    <div id="prints-search-input-wrap">
                        <img src={searchIMG} alt="search" id="prints-search-icon" />
                        <input
                            id="prints-search-input"
                            placeholder="Search artist, catalog #, date, location, notes..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div id="prints-filter-row">
                        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                            <option value="ALL">All Statuses</option>
                            <option value="Available">Available</option>
                            <option value="Sold">Sold</option>
                            <option value="Unavailable">Unavailable</option>
                        </select>
                        <select value={filterSize} onChange={(e) => setFilterSize(e.target.value)}>
                            <option value="ALL">All Sizes</option>
                            <option value="11x14">11x14</option>
                            <option value="11x14C">11x14C</option>
                            <option value="16x20">16x20</option>
                        </select>
                        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                            <option value="ALL">All Categories</option>
                            <option value="Musicians">Musicians</option>
                            <option value="Other">Other</option>
                        </select>
                        <select value={filterSigned} onChange={(e) => setFilterSigned(e.target.value)}>
                            <option value="ALL">Signed: All</option>
                            <option value="true">Signed: Yes</option>
                            <option value="false">Signed: No</option>
                        </select>
                        {hasActiveFilters && (
                            <button type="button" className="btn btn-outline-light btn-sm" onClick={clearFilters}>
                                Clear
                            </button>
                        )}
                    </div>
                </div>
            )}

            {isSignedIn && allPrints && printCount === 0 && (
                <h5 id="no-prints-message">No prints in the database yet!</h5>
            )}

            {isSignedIn && allPrints && printCount > 0 && (
                <>
                    <h5 id="print-count">
                        {hasActiveFilters
                            ? `${filteredPrints.length} of ${printCount} print(s)`
                            : `Print Count: ${printCount}`}
                    </h5>

                    {filteredPrints.length === 0 ? (
                        <h5 id="no-prints-message">No prints match your search or filters.</h5>
                    ) : (
                        <div id="prints-container">
                            {filteredPrints.map((print, idx) => (
                                <PrintCard
                                    key={idx}
                                    print={print}
                                    onEdit={handleEditBtnClick}
                                    onDelete={handleDeleteBtnClick}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}
        </>
    );
}

export default Prints;