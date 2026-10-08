package main

import (
	"io"
	"strings"
	"testing"
)

// op item list --categories Login --format json の出力（必要なフィールドだけ）
const itemListJSON = `[
  {"id": "abc123", "title": "KING OF TIME", "vault": {"id": "v1", "name": "Work"},
   "additional_information": "user01",
   "urls": [{"primary": true, "href": "https://s2.ta.kingoftime.jp/admin"}]},
  {"id": "zzz999", "title": "GitHub", "vault": {"id": "v2", "name": "Private"},
   "urls": [{"href": "https://github.com/login"}]},
  {"id": "nourl1", "title": "メモ", "vault": {"id": "v2", "name": "Private"}}
]`

func TestFindCandidatesKeepsOnlyKingOfTimeLogins(t *testing.T) {
	got, err := findCandidates([]byte(itemListJSON))
	if err != nil {
		t.Fatal(err)
	}
	want := []candidate{{ID: "abc123", Title: "KING OF TIME", VaultID: "v1", VaultName: "Work", Username: "user01"}}
	if len(got) != 1 || got[0] != want[0] {
		t.Fatalf("got %+v", got)
	}
}

var (
	work = candidate{ID: "abc123", Title: "KING OF TIME", VaultID: "v1", VaultName: "Work", Username: "user01"}
	old  = candidate{ID: "def456", Title: "KING OF TIME 旧", VaultID: "v2", VaultName: "Private", Username: "user99"}
)

func TestChooseCandidateUsesTheOnlyOneWithoutAsking(t *testing.T) {
	var out strings.Builder

	got, err := chooseCandidate([]candidate{work}, strings.NewReader(""), &out)

	if err != nil || got != work {
		t.Fatalf("got %+v, %v", got, err)
	}
	if !strings.Contains(out.String(), "KING OF TIME（Work / user01）") {
		t.Fatalf("out = %q", out.String())
	}
}

func TestChooseCandidateAsksForNumberWhenSeveral(t *testing.T) {
	var out strings.Builder

	got, err := chooseCandidate([]candidate{work, old}, strings.NewReader("2\n"), &out)

	if err != nil || got != old {
		t.Fatalf("got %+v, %v", got, err)
	}
	if !strings.Contains(out.String(), "2) KING OF TIME 旧（Private / user99）") {
		t.Fatalf("out = %q", out.String())
	}
}

func TestChooseCandidateRejectsOutOfRangeNumber(t *testing.T) {
	_, err := chooseCandidate([]candidate{work, old}, strings.NewReader("3\n"), io.Discard)

	if err == nil {
		t.Fatal("want error")
	}
}

func TestChooseCandidateExplainsWhatToDoWhenNoneFound(t *testing.T) {
	_, err := chooseCandidate(nil, strings.NewReader(""), io.Discard)

	if err == nil || !strings.Contains(err.Error(), "--item") {
		t.Fatalf("err = %v", err)
	}
}
