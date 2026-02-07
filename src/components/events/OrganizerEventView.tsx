import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Edit, Users, Tag, Calendar, MapPin, DollarSign, Share2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import AnimatedLogo from '@/components/AnimatedLogo';
import { Event } from '@/types';

interface OrganizerEventViewProps {
    event: Event;
    metrics: any;
    promos: any[];
    isActive: boolean;
}

const OrganizerEventView = ({ event, metrics, promos, isActive }: OrganizerEventViewProps) => {
    const navigate = useNavigate();

    return (
        <div className="container mx-auto px-4 py-8 pb-24">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <Button variant="ghost" onClick={() => navigate('/events')} className="p-2">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Back</span>
                </Button>
                <AnimatedLogo size="sm" />
            </div>

            {/* Event Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
                <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
                        <h1 className="text-2xl lg:text-3xl font-bold truncate">{event.title}</h1>
                        <Badge className={isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                            {isActive ? 'Active' : 'Inactive'}
                        </Badge>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>{event.date} • {event.time}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            <span>{event.location}</span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => { /* Toggle share logic */ }}>
                        <Share2 className="w-4 h-4 mr-2" />
                        Share
                    </Button>
                    <Button variant="default" onClick={() => navigate(`/create-event/${event.id}`)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Event
                    </Button>
                </div>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <MetricCard label="Total Tickets" value={metrics.totalTickets} />
                <MetricCard label="Sold" value={metrics.soldTickets} color="text-blue-600" />
                <MetricCard label="Used" value={metrics.usedTickets} color="text-green-600" />
                <MetricCard
                    label="Revenue"
                    value={<span className="flex items-center"><DollarSign className="w-4 h-4 mr-1" /> ₦{metrics.revenue.toLocaleString()}</span>}
                />
            </div>

            {/* Ticket Types Management Summary */}
            <Card className="glass-card mb-8">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Tag className="w-5 h-5" />
                        Ticket Types
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {event.ticketTypes?.map(type => (
                        <div key={type.id} className="flex justify-between p-3 bg-primary/10 rounded-lg">
                            <div>
                                <span className="font-medium">{type.name}</span>
                                {type.hasSeating && <Badge variant="outline" className="ml-2 text-xs">Seating</Badge>}
                            </div>
                            <div className="text-sm">
                                ₦{type.price.toLocaleString()} • {type.quantity} qty
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>


            {/* Promo Codes */}
            {promos.length > 0 && (
                <Card className="glass-card mb-8">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Tag className="w-5 h-5" />
                            Promo Codes
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {promos.map(promo => (
                            <div key={promo.id} className="flex justify-between p-3 bg-primary/10 rounded-lg">
                                <div>
                                    <span className="font-medium">{promo.code}</span>
                                    <span className="text-sm text-muted-foreground ml-2">
                                        {promo.discountPercentage}% off
                                    </span>
                                </div>
                                <div className="text-sm">
                                    {promo.usedCount}/{promo.ticketLimit} used
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Collaborator Performance */}
            <Card className="glass-card">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Users className="w-5 h-5" />
                        Collaborator Performance
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <CollabStat title="Direct Sales" value={metrics.soldTickets - metrics.collabSales} />
                    <CollabStat title="Collaborator Sales" value={metrics.collabSales} />
                </CardContent>
            </Card>
        </div>
    );
};

// Reusable metric card
const MetricCard = ({ label, value, color = "text-foreground" }: { label: string, value: React.ReactNode, color?: string }) => (
    <Card className="glass-card">
        <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{label}</CardTitle>
        </CardHeader>
        <CardContent>
            <div className={`text-xl font-bold ${color}`}>{value}</div>
        </CardContent>
    </Card>
);

// Reusable collaborator stat
const CollabStat = ({ title, value }: { title: string, value: number }) => (
    <div className="flex justify-between p-3 bg-primary/10 rounded-lg">
        <div>
            <div className="font-medium">{title}</div>
            <div className="text-sm text-muted-foreground">{title === "Direct Sales" ? "Organizer sales" : "Via shared links"}</div>
        </div>
        <div className="text-right">
            <div className="font-bold">{value}</div>
            <div className="text-sm text-muted-foreground">tickets</div>
        </div>
    </div>
);

export default OrganizerEventView;
