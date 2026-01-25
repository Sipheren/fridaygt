"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { VirtualizedList, type VirtualizedListItem } from "@/components/ui/virtualized-list"

export interface ComboBoxOption {
  value: string
  label: string
  group?: string // Optional group key for grouping
  searchTerms?: string // Optional additional search terms
}

interface SearchableComboBoxProps {
  options: ComboBoxOption[]
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  emptyText?: string
  searchPlaceholder?: string
  disabled?: boolean
  className?: string
  // New props for grouping and enhanced functionality
  grouped?: boolean // Enable grouped display (default: false)
  groupLabelClassName?: string // Custom styling for group headers
  isLoading?: boolean // Show loading state
  error?: string // Show error message
  virtualized?: boolean // Enable virtualization for large lists (default: false)
}

export function SearchableComboBox({
  options,
  value,
  onValueChange,
  placeholder = "Select option...",
  emptyText = "No option found.",
  searchPlaceholder = "Search...",
  disabled = false,
  className,
  grouped = false,
  groupLabelClassName,
  isLoading = false,
  error,
  virtualized = false,
}: SearchableComboBoxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Reset search when popover closes
  React.useEffect(() => {
    if (!open) {
      setSearchQuery("")
    }
  }, [open])

  // Find the selected option to display its label
  const selectedOption = options.find((option) => option.value === value)

  // Filter options using "contains" matching
  const filteredOptions = React.useMemo(() => {
    if (!searchQuery) return options

    const query = searchQuery.toLowerCase()
    return options.filter((option) => {
      const labelMatch = option.label.toLowerCase().includes(query)
      const searchTermsMatch = option.searchTerms?.toLowerCase().includes(query)
      return labelMatch || searchTermsMatch
    })
  }, [options, searchQuery])

  // Group filtered options if grouping is enabled
  const groupedOptions = React.useMemo(() => {
    if (!grouped) return null

    const groups: Record<string, ComboBoxOption[]> = {}
    filteredOptions.forEach((option) => {
      const groupKey = option.group || "Other"
      if (!groups[groupKey]) {
        groups[groupKey] = []
      }
      groups[groupKey].push(option)
    })

    // Sort groups alphabetically (put "Other" at the end)
    const sortedGroups: Record<string, ComboBoxOption[]> = {}
    Object.keys(groups)
      .sort((a, b) => {
        if (a === "Other") return 1
        if (b === "Other") return -1
        return a.localeCompare(b)
      })
      .forEach((key) => {
        sortedGroups[key] = groups[key]
      })

    return sortedGroups
  }, [filteredOptions, grouped])

  // Flatten options for virtualization
  const flatOptions = React.useMemo((): VirtualizedListItem[] => {
    if (!grouped || !groupedOptions) {
      return filteredOptions.map((opt) => ({ type: 'item' as const, data: opt }))
    }

    const flat: VirtualizedListItem[] = []
    Object.entries(groupedOptions).forEach(([groupName, groupOptions]) => {
      flat.push({ type: 'header', data: groupName })
      groupOptions.forEach((opt) => {
        flat.push({ type: 'item', data: opt })
      })
    })
    return flat
  }, [grouped, groupedOptions, filteredOptions])

  // Handle option selection - NO DESELECTION (keep selected value)
  const handleSelect = (optionValue: string) => {
    // Only allow selection, not deselection - for required fields
    if (optionValue !== value) {
      onValueChange(optionValue)
    }
    setOpen(false)
    setSearchQuery("")
  }

  // Handle search input change
  const handleSearchChange = (query: string) => {
    setSearchQuery(query)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || isLoading}
          className={cn(
            "w-full justify-between",
            !selectedOption && "text-muted-foreground",
            className
          )}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              {selectedOption?.label ?? placeholder}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[200px] max-w-[95vw] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            ref={inputRef}
            placeholder={searchPlaceholder}
            onValueChange={handleSearchChange}
          />

          {error ? (
            <div className="py-6 text-center text-sm text-destructive">{error}</div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : (
            <>
              {virtualized ? (
                // Virtualized rendering - use custom VirtualizedList component
                flatOptions.length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    {emptyText}
                  </div>
                ) : (
                  <VirtualizedList
                    items={flatOptions}
                    onSelect={handleSelect}
                    selectedValue={value}
                  />
                )
              ) : (
                // Non-virtualized rendering - use cmdk CommandList
                <CommandList>
                  <CommandEmpty>{emptyText}</CommandEmpty>

                  {grouped && groupedOptions ? (
                    // Grouped rendering
                    Object.entries(groupedOptions).map(([groupKey, groupOptions]) => (
                      <CommandGroup
                        key={groupKey}
                        heading={groupKey}
                        className={groupLabelClassName}
                      >
                        {groupOptions.map((option) => (
                          <CommandItem
                            key={option.value}
                            value={option.value}
                            onSelect={() => handleSelect(option.value)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                value === option.value ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {option.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    ))
                  ) : (
                    // Non-grouped rendering
                    <CommandGroup>
                      {filteredOptions.map((option) => (
                        <CommandItem
                          key={option.value}
                          value={option.value}
                          onSelect={() => handleSelect(option.value)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              value === option.value ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {option.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </CommandList>
              )}
            </>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  )
}
