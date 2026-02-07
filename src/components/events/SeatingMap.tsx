import React from 'react';
import { Seat, SeatingConfig } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SeatingMapProps {
    config: SeatingConfig;
    bookedSeats: string[];
    selectedSeat: string | null;
    onSelect: (seatId: string) => void;
    selectedSeats?: string[];
    maxSeats?: number;
    onSelectMultiple?: (seatIds: string[]) => void;
}

const SeatingMap = ({ config, bookedSeats, selectedSeat, onSelect, selectedSeats = [], maxSeats = 1, onSelectMultiple }: SeatingMapProps) => {

    const isMultiSelect = maxSeats > 1 && onSelectMultiple;

    const handleSeatClick = (seatId: string) => {
        if (isMultiSelect) {
            if (selectedSeats.includes(seatId)) {
                onSelectMultiple(selectedSeats.filter(s => s !== seatId));
            } else if (selectedSeats.length < maxSeats) {
                onSelectMultiple([...selectedSeats, seatId]);
            }
        } else {
            onSelect(seatId);
        }
    };

    // Helper to generate seats based on config
    // In a real app, this would likely come from the backend database of all seats
    // Here we generate them dynamically for the prototype based on dimensions
    const renderGrid = () => {
        const rows = config.rows || 10;
        const cols = config.cols || 10;
        const grid = [];

        for (let r = 0; r < rows; r++) {
            const rowSeats = [];
            for (let c = 0; c < cols; c++) {
                const seatLabel = `${String.fromCharCode(65 + r)}${c + 1}`;
                const seatId = `seat-${r}-${c}`;
                const isBooked = bookedSeats.includes(seatId);
                const isSelected = isMultiSelect ? selectedSeats.includes(seatId) : selectedSeat === seatId;

                rowSeats.push(
                    <button
                        key={seatId}
                        disabled={isBooked}
                        onClick={() => handleSeatClick(seatId)}
                        className={cn(
                            "w-8 h-8 m-1 rounded-md text-xs font-medium transition-all duration-200 flex items-center justify-center", // Generic rounded square
                            isBooked
                                ? "bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
                                : isSelected
                                    ? "bg-primary text-primary-foreground shadow-md scale-105 border-2 border-primary"
                                    : "bg-secondary hover:bg-primary/20 border border-border/50"
                        )}
                        title={seatLabel}
                    >
                        {c + 1}
                    </button>
                );
            }
            grid.push(
                <div key={`row-${r}`} className="flex items-center gap-2 mb-2">
                    <span className="w-6 text-center font-bold text-muted-foreground text-sm">{String.fromCharCode(65 + r)}</span>
                    <div className="flex flex-nowrap">{rowSeats}</div>
                </div>
            );
        }
        return (
            <div className="overflow-auto pb-4">
                <div className="flex flex-col items-center min-w-max p-4 bg-background/50 rounded-xl border border-border/50">
                    {grid}
                </div>
            </div>
        );
    };

    const renderTables = () => {
        const tables = [];
        const tableCount = config.tableCount || 6;
        const seatsPerTable = config.seatsPerTable || 4;

        for (let t = 0; t < tableCount; t++) {
            const seats = [];
            const tableId = `table-${t + 1}`;

            for (let s = 0; s < seatsPerTable; s++) {
                const seatId = `${tableId}-s${s + 1}`;
                const isBooked = bookedSeats.includes(seatId);
                const isSelected = isMultiSelect ? selectedSeats.includes(seatId) : selectedSeat === seatId;

                // Calculate position around volume
                const angle = (s * 360) / seatsPerTable;
                const radius = 36; // Slightly tighter radius
                const x = Math.cos((angle * Math.PI) / 180) * radius;
                const y = Math.sin((angle * Math.PI) / 180) * radius;

                seats.push(
                    <button
                        key={seatId}
                        disabled={isBooked}
                        onClick={() => handleSeatClick(seatId)}
                        style={{
                            transform: `translate(${x}px, ${y}px)`,
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            marginTop: '-10px',
                            marginLeft: '-10px'
                        }}
                        className={cn(
                            "w-5 h-5 rounded-full text-[10px] flex items-center justify-center transition-all shadow-sm", // Generic circle
                            isBooked
                                ? "bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
                                : isSelected
                                    ? "bg-primary text-primary-foreground scale-110 border-2 border-background z-10"
                                    : "bg-background border-2 border-primary/30 hover:bg-primary hover:text-primary-foreground hover:border-primary"
                        )}
                    >
                        {s + 1}
                    </button>
                );
            }

            tables.push(
                <div key={tableId} className="relative w-28 h-28 m-4">
                    {/* The Table Surface - Neutral styling */}
                    <div className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-secondary/50 border border-border flex items-center justify-center">
                        <span className="font-medium text-muted-foreground text-xs">T{t + 1}</span>
                    </div>
                    {/* The Seats */}
                    {seats}
                </div>
            );
        }

        return (
            <div className="overflow-auto pb-4">
                <div className="flex flex-wrap justify-center gap-4 min-w-[300px] p-6 bg-background/50 rounded-xl border border-border/50">
                    {tables}
                </div>
            </div>
        );
    };

    return (
        <div className="w-full h-full flex flex-col">
            <div className="flex justify-center gap-4 sm:gap-6 mb-4 text-xs sm:text-sm">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-secondary border border-primary/30"></div>
                    <span>Available</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-primary"></div>
                    <span>Selected</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-muted opacity-50"></div>
                    <span>Booked</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-[300px] max-h-[50vh] border rounded-lg bg-secondary/5">
                {config.layoutType === 'tables' ? renderTables() : renderGrid()}
            </div>

            <div className="mt-4 text-center">
                <div className="bg-secondary/50 inline-block px-3 py-1 rounded-full text-muted-foreground text-xs uppercase tracking-widest border border-border/50">
                    Stage / Screen / focal point
                </div>
            </div>
        </div>
    );
};

export default SeatingMap;
