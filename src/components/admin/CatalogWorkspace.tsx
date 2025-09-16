import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { BookOpen, Search, Plus, ChevronDown, Stethoscope, Pill, Settings2, Sparkles, Table2 } from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';
import { CatalogComposer } from './CatalogComposer';
import { QuickPairModal } from './QuickPairModal';
import { BulkMapSheet } from './BulkMapSheet';

type ItemType = 'diagnosis' | 'treatment';
type FilterType = 'all' | 'diagnoses' | 'treatments';

interface CatalogItem {
  id: string;
  type: ItemType;
  code: string | null;
  name_en: string;
  name_ar: string | null;
  active: boolean;
}

export function CatalogWorkspace() {
  const { useDiagnoses, useTreatments, updateDiagnosis, updateTreatment } = useAdmin();
  const { data: diagnoses, isLoading: diagnosesLoading } = useDiagnoses();
  const { data: treatments, isLoading: treatmentsLoading } = useTreatments();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [showQuickPair, setShowQuickPair] = useState(false);
  const [showBulkMap, setShowBulkMap] = useState(false);

  // Merge and transform data
  const mergedItems = useMemo<CatalogItem[]>(() => {
    const diagnosisItems: CatalogItem[] = (diagnoses || []).map(dx => ({
      id: dx.id,
      type: 'diagnosis' as const,
      code: dx.code,
      name_en: dx.name_en,
      name_ar: dx.name_ar,
      active: dx.active
    }));

    const treatmentItems: CatalogItem[] = (treatments || []).map(tx => ({
      id: tx.id,
      type: 'treatment' as const,
      code: tx.code,
      name_en: tx.name_en,
      name_ar: tx.name_ar,
      active: tx.active
    }));

    return [...diagnosisItems, ...treatmentItems].sort((a, b) => a.name_en.localeCompare(b.name_en));
  }, [diagnoses, treatments]);

  // Filter items
  const filteredItems = useMemo(() => {
    let items = mergedItems;

    // Apply search filter
    if (searchTerm) {
      items = items.filter(item => 
        item.name_en.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.name_ar?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply type filter
    if (filter === 'diagnoses') {
      items = items.filter(item => item.type === 'diagnosis');
    } else if (filter === 'treatments') {
      items = items.filter(item => item.type === 'treatment');
    }

    return items;
  }, [mergedItems, searchTerm, filter]);

  const handleToggleActive = async (item: CatalogItem, active: boolean) => {
    try {
      if (item.type === 'diagnosis') {
        await updateDiagnosis.mutateAsync({ id: item.id, active });
      } else {
        await updateTreatment.mutateAsync({ id: item.id, active });
      }
      
      // Update local state
      if (selectedItem?.id === item.id) {
        setSelectedItem({ ...selectedItem, active });
      }
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleSelectItem = (item: CatalogItem) => {
    setSelectedItem(item);
  };

  const isLoading = diagnosesLoading || treatmentsLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <BookOpen className="h-6 w-6 mr-3 text-primary" />
          <div>
            <h2 className="text-2xl font-semibold">Clinical Catalog</h2>
            <p className="text-sm text-muted-foreground">
              Unified workspace for diagnoses, treatments, and clinical rules
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSelectedItem({ id: 'new-diagnosis', type: 'diagnosis', code: null, name_en: '', name_ar: null, active: true })}>
                <Stethoscope className="h-4 w-4 mr-2" />
                New Diagnosis
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedItem({ id: 'new-treatment', type: 'treatment', code: null, name_en: '', name_ar: null, active: true })}>
                <Pill className="h-4 w-4 mr-2" />
                New Treatment
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowQuickPair(true)}>
                <Sparkles className="h-4 w-4 mr-2" />
                Quick Pair (Diagnosis + Treatments)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button variant="outline" onClick={() => setShowBulkMap(true)}>
            <Table2 className="h-4 w-4 mr-2" />
            Bulk Map
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, code, or Arabic..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Badge 
            variant={filter === 'all' ? 'default' : 'outline'} 
            className="cursor-pointer"
            onClick={() => setFilter('all')}
          >
            All ({mergedItems.length})
          </Badge>
          <Badge 
            variant={filter === 'diagnoses' ? 'default' : 'outline'} 
            className="cursor-pointer"
            onClick={() => setFilter('diagnoses')}
          >
            Diagnoses ({mergedItems.filter(i => i.type === 'diagnosis').length})
          </Badge>
          <Badge 
            variant={filter === 'treatments' ? 'default' : 'outline'} 
            className="cursor-pointer"
            onClick={() => setFilter('treatments')}
          >
            Treatments ({mergedItems.filter(i => i.type === 'treatment').length})
          </Badge>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 min-h-[600px]">
        {/* Left Panel - Merged List */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardContent className="p-0">
              <div className="space-y-1 max-h-[600px] overflow-y-auto">
                {isLoading ? (
                  <div className="p-6 text-center text-muted-foreground">
                    Loading catalog...
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">
                    No items found matching your search.
                  </div>
                ) : (
                  filteredItems.map((item) => (
                    <div
                      key={item.id}
                      className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                        selectedItem?.id === item.id ? 'bg-primary/5 border-l-4 border-l-primary' : ''
                      }`}
                      onClick={() => handleSelectItem(item)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Badge variant={item.type === 'diagnosis' ? 'default' : 'secondary'} className="shrink-0">
                            {item.type === 'diagnosis' ? (
                              <><Stethoscope className="h-3 w-3 mr-1" />Dx</>
                            ) : (
                              <><Pill className="h-3 w-3 mr-1" />Tx</>
                            )}
                          </Badge>
                          
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{item.name_en}</div>
                            {item.name_ar && (
                              <div className="text-sm text-muted-foreground truncate">{item.name_ar}</div>
                            )}
                            {item.code && (
                              <div className="text-xs font-mono text-muted-foreground">{item.code}</div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 shrink-0">
                          <Switch
                            checked={item.active}
                            onCheckedChange={(checked) => handleToggleActive(item, checked)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Composer */}
        <div className="lg:col-span-3">
          <CatalogComposer
            selectedItem={selectedItem}
            onItemUpdated={(updatedItem) => setSelectedItem(updatedItem)}
            onItemCreated={(newItem) => {
              setSelectedItem(newItem);
              // Refresh will happen via React Query invalidation
            }}
          />
        </div>
      </div>

      {/* Modals */}
      <QuickPairModal
        open={showQuickPair}
        onOpenChange={setShowQuickPair}
        onCreated={(diagnosis) => {
          setSelectedItem({
            id: diagnosis.id,
            type: 'diagnosis',
            code: diagnosis.code,
            name_en: diagnosis.name_en,
            name_ar: diagnosis.name_ar,
            active: diagnosis.active
          });
        }}
      />

      <BulkMapSheet
        open={showBulkMap}
        onOpenChange={setShowBulkMap}
      />
    </div>
  );
}