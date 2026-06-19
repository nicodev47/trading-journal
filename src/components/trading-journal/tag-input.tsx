'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Plus } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface TagInputProps {
  selectedTags: string[];
  availableTags: string[];
  onChange: (tags: string[]) => void;
  onAddNew?: (tag: string) => void;
}

export function TagInput({
  selectedTags,
  availableTags,
  onChange,
  onAddNew,
}: TagInputProps) {
  const [newTag, setNewTag] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const unselectedTags = availableTags.filter(tag => !selectedTags.includes(tag));

  const addTag = (tag: string) => {
    if (!selectedTags.includes(tag)) {
      onChange([...selectedTags, tag]);
    }
  };

  const removeTag = (tag: string) => {
    onChange(selectedTags.filter(t => t !== tag));
  };

  const handleAddNew = () => {
    const trimmed = newTag.trim();
    if (trimmed && !availableTags.includes(trimmed)) {
      onAddNew?.(trimmed);
      addTag(trimmed);
      setNewTag('');
    } else if (trimmed && availableTags.includes(trimmed)) {
      addTag(trimmed);
      setNewTag('');
    }
  };

  return (
    <div className="space-y-2">
      {/* Selected Tags */}
      <div className="flex flex-wrap gap-1.5">
        {selectedTags.map(tag => (
          <Badge
            key={tag}
            variant="secondary"
            className="gap-1 pr-1"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="ml-0.5 rounded-full p-0.5 hover:bg-foreground/10"
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}

        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-6 gap-1 px-2 text-xs"
            >
              <Plus className="size-3" />
              Add Tag
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="start">
            <div className="space-y-2">
              {/* Quick select existing tags */}
              {unselectedTags.length > 0 && (
                <div className="ej-scrollbar flex max-h-32 flex-wrap gap-1 overflow-y-auto overscroll-contain">
                  {unselectedTags.map(tag => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className={cn(
                        'cursor-pointer transition-colors hover:bg-secondary'
                      )}
                      onClick={() => {
                        addTag(tag);
                        setIsOpen(false);
                      }}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Add new tag */}
              {onAddNew && (
                <>
                  {unselectedTags.length > 0 && (
                    <div className="border-t border-border pt-2" />
                  )}
                  <div className="flex gap-1">
                    <Input
                      placeholder="New tag..."
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddNew();
                        }
                      }}
                      className="h-7 text-xs"
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 px-2"
                      onClick={handleAddNew}
                      disabled={!newTag.trim()}
                    >
                      Add
                    </Button>
                  </div>
                </>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
