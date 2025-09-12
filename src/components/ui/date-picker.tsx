
"use client"

import * as React from "react"
import { format } from "date-fns"
import { es, ca } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useTranslation } from "../i18n-provider"

type DatePickerProps = {
  date: Date | undefined,
  onDateChange: (date: Date | undefined) => void,
  disabled?: boolean
}

export function DatePicker({ date, onDateChange, disabled }: DatePickerProps) {
  const { locale } = useTranslation();
  const currentYear = new Date().getFullYear();
  const localeToUse = locale === 'ca' ? ca : es;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP", { locale: localeToUse }) : <span>Selecciona una fecha</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          locale={localeToUse}
          selected={date}
          onSelect={onDateChange}
          captionLayout="dropdown-buttons"
          fromYear={1950}
          toYear={currentYear + 1}
          initialFocus
          disabled={disabled}
        />
      </PopoverContent>
    </Popover>
  )
}
