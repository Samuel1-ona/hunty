import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Button } from "@/components/ui/button"

const schema = z.object({
  huntName: z.string().min(3, "Hunt name must be at least 3 characters."),
})

function ExampleForm() {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      huntName: "",
    },
  })

  return (
    <Form {...form}>
      <form className="max-w-md space-y-4" onSubmit={form.handleSubmit(() => undefined)}>
        <FormField
          control={form.control}
          name="huntName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Hunt Name</FormLabel>
              <FormControl placeholder="Downtown Puzzle Run" {...field} />
              <FormDescription>Name shown in the public arcade.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Save Draft</Button>
      </form>
    </Form>
  )
}

const meta = {
  title: "UI/Form",
  component: ExampleForm,
  tags: ["autodocs"],
} satisfies Meta<typeof ExampleForm>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
