import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Edit, Users, Tag, Calendar, MapPin, DollarSign, Share2, Lock, Unlock, Upload, Trash2, Mail, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import AnimatedLogo from '@/components/AnimatedLogo';
import { Event, PromoCode } from '@/types';
import { toast } from 'sonner';
import {
    setAccessMode, bulkUploadFile, bulkUploadGuests,
    listInvites, revokeInvite, InviteResponse, GuestEntry,
} from '@/api/invites';

interface EventMetrics {
    totalTickets: number;
    soldTickets: number;
    remainingTickets: number;
    usedTickets: number;
    promoUses: number;
    collabSales: number;
    revenue: number;
}

interface OrganizerEventViewProps {
    event: Event;
    metrics: EventMetrics;
    promos: PromoCode[];
    isActive: boolean;
}

const OrganizerEventView = ({ event, metrics, promos, isActive }: OrganizerEventViewProps) => {
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Invite management state
    const [accessMode, setMode] = useState<'public' | 'invite_only'>(
        (event as any).accessMode ?? 'public'
    );
    const [invites, setInvites] = useState<InviteResponse[]>([]);
    const [invitesLoading, setInvitesLoading] = useState(false);
    const [rsvpDeadline, setRsvpDeadline] = useState('');
    const [uploading, setUploading] = useState(false);

    // Load invites when panel is first opened
    useEffect(() => {
        if (accessMode !== 'invite_only') return;
        setInvitesLoading(true);
        listInvites(event.id)
            .then(setInvites)
            .catch(() => toast.error('Failed to load guest list'))
            .finally(() => setInvitesLoading(false));
    }, [accessMode, event.id]);

    const toggleAccessMode = async () => {
        const next = accessMode === 'public' ? 'invite_only' : 'public';
        try {
            await setAccessMode(event.id, next, rsvpDeadline || undefined);
            setMode(next);
            toast.success(next === 'invite_only' ? 'Event set to invite only' : 'Event set to public');
        } catch {
            toast.error('Failed to update access mode');
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const result = await bulkUploadFile(event.id, file, rsvpDeadline || undefined);
            toast.success(`${result.created} guests added`, {
                description: result.skipped > 0 ? `${result.skipped} duplicates skipped` : undefined,
            });
            if (result.errors.length > 0) {
                toast.warning(`${result.invalid} rows had errors`, { description: result.errors[0] });
            }
            // Refresh invite list
            const updated = await listInvites(event.id);
            setInvites(updated);
            // Auto-enable invite_only if not already
            if (accessMode === 'public' && result.created > 0) {
                await setAccessMode(event.id, 'invite_only', rsvpDeadline || undefined);
                setMode('invite_only');
            }
        } catch (err: any) {
            toast.error('Upload failed', { description: err?.response?.data?.error?.message || err.message });
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleRevoke = async (inviteId: string) => {
        try {
            await revokeInvite(event.id, inviteId);
            setInvites(prev => prev.map(i => i.id === inviteId ? { ...i, status: 'revoked' as const } : i));
            toast.success('Invite revoked');
        } catch {
            toast.error('Failed to revoke invite');
        }
    };

    const statusIcon = (s: InviteResponse['status']) => {
        if (s === 'redeemed') return <CheckCircle className="w-3.5 h-3.5 text-green-500" />;
        if (s === 'sent')     return <Mail className="w-3.5 h-3.5 text-blue-400" />;
        if (s === 'revoked' || s === 'expired') return <XCircle className="w-3.5 h-3.5 text-destructive" />;
        return <Clock className="w-3.5 h-3.5 text-muted-foreground" />;
    };

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
                    <Button variant="outline" onClick={async () => {
                        if (navigator.share) {
                            try {
                                await navigator.share({ title: event.title, url: window.location.href });
                            } catch { /* user cancelled */ }
                        } else {
                            await navigator.clipboard.writeText(window.location.href);
                        }
                    }}>
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

            {/* Invite Management Panel */}
            <Card className="glass-card mb-8">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between text-lg">
                        <span className="flex items-center gap-2">
                            {accessMode === 'invite_only'
                                ? <Lock className="w-5 h-5 text-primary" />
                                : <Unlock className="w-5 h-5" />}
                            Guest Access
                        </span>
                        <Button
                            variant={accessMode === 'invite_only' ? 'outline' : 'default'}
                            size="sm"
                            onClick={toggleAccessMode}
                        >
                            {accessMode === 'invite_only' ? 'Make Public' : 'Invite Only'}
                        </Button>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* RSVP Deadline */}
                    <div className="flex items-center gap-3">
                        <label className="text-sm text-muted-foreground w-32 shrink-0">RSVP Deadline</label>
                        <Input
                            type="datetime-local"
                            value={rsvpDeadline}
                            onChange={e => setRsvpDeadline(e.target.value)}
                            className="text-sm"
                        />
                    </div>

                    {/* File upload */}
                    <div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv,.json,.docx,.pdf"
                            className="hidden"
                            onChange={handleFileUpload}
                        />
                        <Button
                            variant="outline"
                            className="w-full"
                            disabled={uploading}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Upload className="w-4 h-4 mr-2" />
                            {uploading ? 'Uploading…' : 'Upload Guest List (CSV / JSON / DOCX / PDF)'}
                        </Button>
                        <p className="text-xs text-muted-foreground mt-1">
                            Columns: name, email, ticket_type — header row optional
                        </p>
                    </div>

                    {/* Invite list */}
                    {accessMode === 'invite_only' && (
                        <div className="space-y-2 max-h-72 overflow-y-auto">
                            {invitesLoading && (
                                <p className="text-sm text-muted-foreground text-center py-4">Loading guest list…</p>
                            )}
                            {!invitesLoading && invites.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-4">No guests added yet</p>
                            )}
                            {invites.map(inv => (
                                <div key={inv.id} className="flex items-center justify-between p-2.5 bg-primary/5 rounded-lg">
                                    <div className="flex items-center gap-2 min-w-0">
                                        {statusIcon(inv.status)}
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium truncate">{inv.name || inv.email}</p>
                                            {inv.name && <p className="text-xs text-muted-foreground truncate">{inv.email}</p>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Badge variant="outline" className="text-xs capitalize">{inv.status}</Badge>
                                        {(inv.status === 'pending' || inv.status === 'sent') && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-destructive hover:text-destructive"
                                                onClick={() => handleRevoke(inv.id)}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Stats row */}
                    {invites.length > 0 && (
                        <div className="flex gap-4 text-xs text-muted-foreground pt-1">
                            <span>{invites.filter(i => i.status === 'redeemed').length} confirmed</span>
                            <span>{invites.filter(i => i.status === 'sent').length} sent</span>
                            <span>{invites.filter(i => i.status === 'pending').length} pending</span>
                            <span>{invites.filter(i => i.status === 'revoked').length} revoked</span>
                        </div>
                    )}
                </CardContent>
            </Card>

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
